import { ENV_PROFILES, resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import {
  loadSettings,
  saveSettingsPatch,
  resetUserLocation,
  saveUserLocation,
  hasValidUserLocation,
} from '../lib/userSettings.js';

const envProfile = /** @type {HTMLSelectElement} */ (document.getElementById('env-profile'));
const customOrigin = /** @type {HTMLInputElement} */ (document.getElementById('custom-origin'));
const grantBtn = document.getElementById('grant-permission');
const permissionStatus = document.getElementById('permission-status');
const moderatorId = /** @type {HTMLInputElement} */ (document.getElementById('moderator-id'));
const deviceId = /** @type {HTMLInputElement} */ (document.getElementById('device-id'));
const ragProvider = /** @type {HTMLInputElement} */ (document.getElementById('rag-provider'));
const optLocation = /** @type {HTMLInputElement} */ (document.getElementById('opt-location'));
const saveBtn = document.getElementById('save');
const resetLocationBtn = document.getElementById('reset-location');
const saveStatus = document.getElementById('save-status');

function toggleCustomOrigin() {
  customOrigin.disabled = envProfile.value !== 'custom';
}

function setStatus(msg, isError = false) {
  saveStatus.textContent = msg || '';
  saveStatus.classList.toggle('error', isError);
}

async function loadForm() {
  const s = await loadSettings();
  envProfile.value = s.envProfileId;
  customOrigin.value = s.customApiOrigin || '';
  moderatorId.value = s.moderatorId;
  deviceId.value = s.deviceId;
  ragProvider.value = s.ragProvider;
  optLocation.value = s.userLocation || '';
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
  });

  if (hasValidUserLocation(optLocation.value)) {
    await saveUserLocation(optLocation.value, { onboarding: true });
  }

  const api = resolveApiConfig(profileId, customOrigin.value);
  if (api.apiOrigin) {
    await ensureHostPermission(api.apiOrigin).catch(() => {});
  }

  setStatus('Saved.');
  await refreshPermissionStatus();
});

resetLocationBtn.addEventListener('click', async () => {
  await resetUserLocation();
  optLocation.value = '';
  setStatus('Location reset. Open the side panel to confirm location again.');
});

loadForm().catch((err) => setStatus(err instanceof Error ? err.message : String(err), true));
