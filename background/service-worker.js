import { resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import { postModerate } from '../lib/moderateClient.js';
import { loadSettings, hasValidUserLocation } from '../lib/userSettings.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

/**
 * @param {import('../lib/userSettings.js').loadSettings extends () => Promise<infer T> ? T : never} settings
 * @param {object} payload
 */
async function runModeration(settings, payload) {
  if (!hasValidUserLocation(settings.userLocation)) {
    throw new Error('Set your feed location before moderating.');
  }

  const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
  if (!api.moderateUrl) {
    throw new Error('Invalid API origin. Check Options → environment profile.');
  }

  const granted = await ensureHostPermission(api.apiOrigin);
  if (!granted) {
    throw new Error(`Host permission denied for ${api.apiOrigin}. Grant access in the extension prompt or Options.`);
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

  const result = await postModerate(api.moderateUrl, body);
  return { result, api };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'MODERATE') return false;

  (async () => {
    try {
      const settings = await loadSettings();
      const { result, api } = await runModeration(settings, message.payload || {});
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
    }
  })();

  return true;
});
