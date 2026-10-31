import { resolveApiConfig } from '../lib/envProfiles.js';
import { hasHostPermission } from '../lib/permissions.js';
import { postModerate } from '../lib/moderateClient.js';
import { loadSettings, isFeedLocationConfirmed } from '../lib/userSettings.js';
import { moderateTimeoutMs } from '../lib/moderationTimeout.js';
import { MODERATION_TARGET_TAB_SESSION_KEY } from '../lib/pageAccess.js';
import { startPickModeOnActiveTab, settlePickModeMessage, cancelPickModeOnTab } from '../lib/pickMode.js';
import {
  registerModerationContextMenu,
  handleModerationContextMenuClick,
} from '../lib/contextMenu.js';

function onInstalled() {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  registerModerationContextMenu();
}

chrome.runtime.onInstalled.addListener(onInstalled);
registerModerationContextMenu();

chrome.contextMenus.onClicked.addListener((info, tab) => {
  handleModerationContextMenuClick(info, tab).catch(() => {});
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.storage.session.set({ [MODERATION_TARGET_TAB_SESSION_KEY]: tabId }).catch(() => {});
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

  const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
  if (!api.moderateUrl) {
    throw new Error('Invalid API origin. Check Options → environment profile.');
  }

  const granted = await hasHostPermission(api.apiOrigin);
  if (!granted) {
    throw new Error(
      `Host permission required for ${api.apiOrigin}. Click Moderate again and allow access, or use Options → Grant host permission.`,
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
    emailReport: false,
  };
  if (payload.postContext && String(payload.postContext).trim()) {
    body.postContext = String(payload.postContext).trim().slice(0, 8000);
  }

  const timeoutMs = moderateTimeoutMs(settings.moderateTimeoutSec);
  const result = await postModerate(api.moderateUrl, body, { signal, timeoutMs });
  return { result, api };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
