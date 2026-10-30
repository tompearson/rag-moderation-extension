import { ENV_PROFILES, resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import {
  loadSettings,
  saveSettingsPatch,
  resetUserLocation,
  saveUserLocation,
  hasValidUserLocation,
} from '../lib/userSettings.js';
import { DEFAULT_USER_LOCATION } from '../lib/usStates.js';
import { createStatePicker } from '../lib/statePicker.js';
import { parseModerateTimeoutSec } from '../lib/moderationTimeout.js';
import { factoryResetExtension } from '../lib/factoryReset.js';

const envProfile = /** @type {HTMLSelectElement} */ (document.getElementById('env-profile'));
const moderateTimeoutSec = /** @type {HTMLInputElement} */ (
  document.getElementById('moderate-timeout-sec')
);
const customOrigin = /** @type {HTMLInputElement} */ (document.getElementById('custom-origin'));
const grantBtn = document.getElementById('grant-permission');
const permissionStatus = document.getElementById('permission-status');
const moderatorId = /** @type {HTMLInputElement} */ (document.getElementById('moderator-id'));
const deviceId = /** @type {HTMLInputElement} */ (document.getElementById('device-id'));
const ragProvider = /** @type {HTMLInputElement} */ (document.getElementById('rag-provider'));
const optLocationHost = document.getElementById('opt-location');
const optLocationPicker = createStatePicker(optLocationHost, {
  initialValue: DEFAULT_USER_LOCATION,
  triggerId: 'opt-location-trigger',
});
const saveBtn = document.getElementById('save');
const resetLocationBtn = document.getElementById('reset-location');
const factoryResetBtn = document.getElementById('factory-reset');
const saveStatus = document.getElementById('save-status');

/** Ignore one storage event after we wrote userLocation from this page. */
let skipLocationStorageSync = false;

function toggleCustomOrigin() {
  customOrigin.disabled = envProfile.value !== 'custom';
}

function setStatus(msg, isError = false) {
  saveStatus.textContent = msg || '';
  saveStatus.classList.toggle('error', isError);
}

async function syncStatePickerFromStorage() {
  if (optLocationPicker.isListOpen()) return;
  const s = await loadSettings();
  optLocationPicker.setValue(
    hasValidUserLocation(s.userLocation) ? s.userLocation : DEFAULT_USER_LOCATION,
  );
}

async function persistModerateTimeout(showFeedback = false) {
  const sec = parseModerateTimeoutSec(moderateTimeoutSec.value);
  moderateTimeoutSec.value = String(sec);
  const settings = await loadSettings();
  if (settings.moderateTimeoutSec === sec) return;
  await saveSettingsPatch({ moderateTimeoutSec: sec });
  if (showFeedback) setStatus('Timeout saved.');
}

async function loadForm() {
  const s = await loadSettings();
  envProfile.value = s.envProfileId;
  customOrigin.value = s.customApiOrigin || '';
  moderatorId.value = s.moderatorId;
  deviceId.value = s.deviceId;
  ragProvider.value = s.ragProvider;
  moderateTimeoutSec.value = String(s.moderateTimeoutSec);
  await syncStatePickerFromStorage();
  toggleCustomOrigin();
  await refreshPermissionStatus();
}

async function refreshPermissionStatus() {
  const api = resolveApiConfig(
    /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value),
    customOrigin.value,
  );
  if (!api.apiOrigin) {
    permissionStatus.textContent = 'Set a valid API origin.';
    return;
  }
  const pattern = `${api.apiOrigin}/*`;
  const has = await chrome.permissions.contains({ origins: [pattern] });
  permissionStatus.textContent = has
    ? `Host permission granted for ${api.apiOrigin}`
    : `Permission not granted yet for ${api.apiOrigin}`;
}

envProfile.addEventListener('change', () => {
  toggleCustomOrigin();
  refreshPermissionStatus().catch(() => {});
});

customOrigin.addEventListener('input', () => {
  refreshPermissionStatus().catch(() => {});
});

grantBtn.addEventListener('click', async () => {
  const api = resolveApiConfig(
    /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value),
    customOrigin.value,
  );
  if (!api.apiOrigin) {
    setStatus('Invalid origin.', true);
    return;
  }
  const ok = await ensureHostPermission(api.apiOrigin);
  setStatus(ok ? 'Permission granted.' : 'Permission denied.', !ok);
  await refreshPermissionStatus();
});

saveBtn.addEventListener('click', async () => {
  setStatus('');
  const profileId = /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value);
  if (!(profileId in ENV_PROFILES)) {
    setStatus('Invalid profile.', true);
    return;
  }

  await saveSettingsPatch({
    envProfileId: profileId,
    customApiOrigin: customOrigin.value,
    moderatorId: moderatorId.value.trim(),
    deviceId: deviceId.value.trim(),
    ragProvider: ragProvider.value.trim(),
    moderateTimeoutSec: parseModerateTimeoutSec(moderateTimeoutSec.value),
  });

  const api = resolveApiConfig(profileId, customOrigin.value);
  if (api.apiOrigin) {
    await ensureHostPermission(api.apiOrigin).catch(() => {});
  }

  setStatus('Saved.');
  await refreshPermissionStatus();
});

resetLocationBtn.addEventListener('click', async () => {
  await resetUserLocation();
  optLocationPicker.setValue(DEFAULT_USER_LOCATION);
  setStatus('Location reset. Open the side panel to confirm location again.');
});

factoryResetBtn.addEventListener('click', async () => {
  const ok = window.confirm(
    'Reset RAG Moderation Assistant to a clean state?\n\n' +
      '• All saved settings will be erased\n' +
      '• Profile will be set to Production\n' +
      '• Granted host permissions for the API will be removed\n' +
      '• You will see the feed location dialog again in the side panel',
  );
  if (!ok) return;
  setStatus('');
  try {
    await factoryResetExtension();
    await loadForm();
    setStatus('Extension reset. Reopen the side panel and grant host permission when moderating.');
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  }
});

optLocationPicker.onChange(async (selected) => {
  const settings = await loadSettings();
  if (settings.userLocation === selected) return;
  try {
    skipLocationStorageSync = true;
    await saveUserLocation(selected, {
      onboarding: settings.locationOnboardingComplete || true,
    });
    setStatus('');
  } catch (err) {
    skipLocationStorageSync = false;
    setStatus(err instanceof Error ? err.message : String(err), true);
    await syncStatePickerFromStorage();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.userLocation) {
    if (skipLocationStorageSync) {
      skipLocationStorageSync = false;
      return;
    }
    syncStatePickerFromStorage().catch(() => {});
  }
});

moderateTimeoutSec.addEventListener('change', () => {
  persistModerateTimeout(false).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

moderateTimeoutSec.addEventListener('blur', () => {
  persistModerateTimeout(false).catch(() => {});
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    optLocationPicker.closeList();
    persistModerateTimeout(false).catch(() => {});
    return;
  }
  syncStatePickerFromStorage().catch(() => {});
  loadSettings()
    .then((s) => {
      moderateTimeoutSec.value = String(s.moderateTimeoutSec);
    })
    .catch(() => {});
});

loadForm().catch((err) => setStatus(err instanceof Error ? err.message : String(err), true));
