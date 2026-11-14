import { resolveSettingsApiConfig, formatApiProfileUiLabel } from '../lib/envProfiles.js';
import { isStoreBuild } from '../lib/buildConfig.js';
import { isApiOriginHostGranted } from '../lib/permissions.js';
import { postModerate, moderateTimeoutMs } from '../lib/moderateClient.js';
import { loadSettings, isFeedLocationConfirmed } from '../lib/userSettings.js';
import { normalizeReportEmail, isValidReportEmail } from '../lib/validateReportEmail.js';
import { hasSavedGeminiKey, resolveUserApiKeyForModeration } from '../lib/geminiByok.js';
import {
  assertCanUseSharedPoolForModeration,
  recordSharedPoolModerationSuccessIfApplicable,
} from '../lib/sharedPoolQuota.js';
import { MODERATION_TARGET_TAB_SESSION_KEY, moderationCaptureTabId } from '../lib/pageAccess.js';
import {
  DISMISS_STALE_PICK_MODES,
  dismissStalePickOverlaysForAllTabs,
  startPickModeOnActiveTab,
  settlePickModeMessage,
  cancelPickModeOnTab,
} from '../lib/pickMode.js';
import {
  registerModerationContextMenu,
  handleModerationContextMenuClick,
} from '../lib/contextMenu.js';
import { EXTENSION_UI_SYNC } from '../lib/extensionUiSync.js';
import { registerAutoNavMonitor } from '../lib/autoNav.js';

function onInstalled() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  registerModerationContextMenu();
}

chrome.runtime.onInstalled.addListener(() => {
  onInstalled();
  dismissStalePickOverlaysForAllTabs().catch(() => {});
});
registerModerationContextMenu();
registerAutoNavMonitor();

dismissStalePickOverlaysForAllTabs().catch(() => {});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleModerationContextMenuClick(info, tab).catch(() => {});
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => {
      if (moderationCaptureTabId(tab) != null) {
        return chrome.storage.session.set({ [MODERATION_TARGET_TAB_SESSION_KEY]: tabId });
      }
      return undefined;
    })
    .catch(() => {});
  chrome.runtime.sendMessage({ type: 'ACTIVE_TAB_CHANGED' }).catch(() => {});
});

/** @type {Map<string, AbortController>} */
const activeModerations = new Map();

/**
 * @param {import('../lib/userSettings.js').loadSettings extends () => Promise<infer T> ? T : never} settings
 * @param {object} payload
 * @param {string} requestId
 * @param {AbortSignal} signal
 */
async function runModeration(settings, payload, requestId, signal) {
  if (!isFeedLocationConfirmed(settings)) {
    throw new Error('Confirm your feed location in the side panel before moderating.');
  }

  const api = resolveSettingsApiConfig(settings, isStoreBuild());
  if (!api.moderateUrl) {
    throw new Error(
      'Moderation API URL is not configured. Open Options → Advanced → Profile (Custom needs a URL, or use Local dev / Production).',
    );
  }

  const granted = await isApiOriginHostGranted(api.apiOrigin);
  if (!granted) {
    throw new Error(
      `Host permission required for ${formatApiProfileUiLabel(api)}. Click Moderate again and allow access, or use Options → Grant host permission.`,
    );
  }

  const body = {
    content: payload.content,
    provider: settings.ragProvider,
    analysisType: payload.analysisType || 'quick',
    userLocation: settings.userLocation.trim(),
    badWordsEnabled: payload.badWordsEnabled !== false,
    moderatorId: settings.moderatorId,
    deviceId: settings.deviceId,
    emailReport: true,
  };
  if (payload.postContext && String(payload.postContext).trim()) {
    body.postContext = String(payload.postContext).trim().slice(0, 8000);
  }

  const userApiKey = resolveUserApiKeyForModeration(settings);
  if (userApiKey) {
    body.userApiKey = userApiKey;
  } else if (payload.recaptchaToken && String(payload.recaptchaToken).trim()) {
    body.recaptchaToken = String(payload.recaptchaToken).trim();
  } else if (hasSavedGeminiKey(settings)) {
    throw new Error(
      'Saved Gemini key is missing or invalid. Open Options → Save key again or Remove key.',
    );
  }

  const reporterEmail = normalizeReportEmail(settings.reportShareRecipientEmail);
  if (reporterEmail && isValidReportEmail(reporterEmail)) {
    body.reporterEmail = reporterEmail;
  }

  await assertCanUseSharedPoolForModeration(settings);

  const timeoutMs = moderateTimeoutMs(settings.moderateTimeoutSec);
  const result = await postModerate(api.moderateUrl, body, { signal, timeoutMs });
  await recordSharedPoolModerationSuccessIfApplicable(settings, result);
  return { result, api };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === EXTENSION_UI_SYNC && sender.tab?.url?.includes('options/options.html')) {
    chrome.runtime.sendMessage({ type: EXTENSION_UI_SYNC }).catch(() => {});
    return false;
  }

  if (message?.type === 'PICK_MODE_COMPLETE' || message?.type === 'PICK_MODE_CANCELLED') {
    settlePickModeMessage(message.type, sender.tab?.id, message.text);
    return false;
  }

  if (message?.type === 'CANCEL_PICK_MODE') {
    const tabId = typeof message.tabId === 'number' ? message.tabId : undefined;
    cancelPickModeOnTab(tabId).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === DISMISS_STALE_PICK_MODES) {
    dismissStalePickOverlaysForAllTabs()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message?.type === 'START_PICK_MODE') {
    (async () => {
      try {
        const tabId = typeof message.tabId === 'number' ? message.tabId : undefined;
        const text = await startPickModeOnActiveTab(tabId);
        sendResponse({ ok: true, text });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return true;
  }

  if (message?.type === 'MODERATE_ABORT') {
    const id = message.requestId;
    if (typeof id === 'string') activeModerations.get(id)?.abort();
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type !== 'MODERATE') return false;

  const requestId =
    typeof message.requestId === 'string' && message.requestId ? message.requestId : crypto.randomUUID();
  const controller = new AbortController();
  activeModerations.set(requestId, controller);

  (async () => {
    try {
      const settings = await loadSettings();
      const { result, api } = await runModeration(
        settings,
        message.payload || {},
        requestId,
        controller.signal,
      );
      sendResponse({
        ok: true,
        result,
        meta: {
          profileId: api.profileId,
          profileLabel: api.label,
          apiOrigin: api.apiOrigin,
        },
      });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      activeModerations.delete(requestId);
    }
  })();

  return true;
});
