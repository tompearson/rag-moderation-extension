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
import { closeOptionsPageIfOpen } from '../lib/optionsPage.js';
import { normalizeReportEmail, isValidReportEmail } from '../lib/validateReportEmail.js';
import { fillRagProviderSelect, DEFAULT_RAG_PROVIDER } from '../lib/ragProviders.js';
import { isStoreBuild } from '../lib/buildConfig.js';

const envProfile = /** @type {HTMLSelectElement} */ (document.getElementById('env-profile'));
const moderateTimeoutSec = /** @type {HTMLInputElement} */ (
  document.getElementById('moderate-timeout-sec')
);
const customOrigin = /** @type {HTMLInputElement} */ (document.getElementById('custom-origin'));
const grantBtn = document.getElementById('grant-permission');
const permissionStatus = document.getElementById('permission-status');
const moderatorId = /** @type {HTMLInputElement} */ (document.getElementById('moderator-id'));
const deviceId = /** @type {HTMLInputElement} */ (document.getElementById('device-id'));
const ragProvider = /** @type {HTMLSelectElement} */ (document.getElementById('rag-provider'));
const optLocationHost = document.getElementById('opt-location');
const optLocationPicker = createStatePicker(optLocationHost, {
  initialValue: DEFAULT_USER_LOCATION,
  triggerId: 'opt-location-trigger',
});
const saveBtn = document.getElementById('save');
const resetLocationBtn = document.getElementById('reset-location');
const factoryResetBtn = document.getElementById('factory-reset');
const saveStatus = document.getElementById('save-status');
const reportShareEmail = /** @type {HTMLInputElement} */ (document.getElementById('report-share-email'));
const reportEmailEnabled = /** @type {HTMLInputElement} */ (document.getElementById('report-email-enabled'));
const reportOpenTabEnabled = /** @type {HTMLInputElement} */ (
  document.getElementById('report-open-tab-enabled')
);

/** Ignore one storage event after we wrote userLocation from this page. */
let skipLocationStorageSync = false;
/** Ignore storage sync while this page writes report toggles (avoid checkbox flicker). */
let skipReportSettingsSync = false;
/** Ignore storage sync while this page writes environment profile. */
let skipEnvSettingsSync = false;
/** Ignore storage sync while this page writes dev identity fields. */
let skipDevSettingsSync = false;

const envProfileControls = document.getElementById('env-profile-controls');
const envStoreNote = document.getElementById('env-store-note');
const devIdentitySection = document.getElementById('section-dev-identity');

function applyStoreTargetUi() {
  if (!isStoreBuild()) return;
  if (envProfileControls) envProfileControls.hidden = true;
  if (envStoreNote) envStoreNote.hidden = false;
  if (devIdentitySection) devIdentitySection.hidden = true;
  envProfile.value = 'production';
}

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

/** Side panel onboarding / Save may update report email while Options stays open. */
async function syncReportSettingsFromStorage() {
  const s = await loadSettings();
  reportShareEmail.value = s.reportShareRecipientEmail || '';
  reportEmailEnabled.checked = s.reportEmailEnabled;
  reportOpenTabEnabled.checked = s.reportOpenTabEnabled;
}

async function persistReportToggles(showFeedback = false) {
  skipReportSettingsSync = true;
  try {
    await saveSettingsPatch({
      reportEmailEnabled: reportEmailEnabled.checked,
      reportOpenTabEnabled: reportOpenTabEnabled.checked,
    });
    if (showFeedback) setStatus('Report options saved.');
  } finally {
    queueMicrotask(() => {
      skipReportSettingsSync = false;
    });
  }
}

async function persistModerateTimeout(showFeedback = false) {
  const sec = parseModerateTimeoutSec(moderateTimeoutSec.value);
  moderateTimeoutSec.value = String(sec);
  const settings = await loadSettings();
  if (settings.moderateTimeoutSec === sec) return;
  await saveSettingsPatch({ moderateTimeoutSec: sec });
  if (showFeedback) setStatus('Timeout saved.');
}

async function persistReportShareEmail(showFeedback = false) {
  const emailRaw = normalizeReportEmail(reportShareEmail.value);
  if (emailRaw && !isValidReportEmail(emailRaw)) {
    if (showFeedback) {
      setStatus('Enter a valid report email or leave the field empty.', true);
    }
    return false;
  }
  skipReportSettingsSync = true;
  try {
    const settings = await loadSettings();
    if (settings.reportShareRecipientEmail === emailRaw) return true;
    await saveSettingsPatch({ reportShareRecipientEmail: emailRaw });
    if (showFeedback) setStatus('Report email saved.');
    return true;
  } finally {
    queueMicrotask(() => {
      skipReportSettingsSync = false;
    });
  }
}

async function persistDevIdentity(showFeedback = false) {
  skipDevSettingsSync = true;
  try {
    await saveSettingsPatch({
      moderatorId: moderatorId.value.trim(),
      deviceId: deviceId.value.trim(),
    });
    if (showFeedback) setStatus('Identity fields saved.');
  } finally {
    queueMicrotask(() => {
      skipDevSettingsSync = false;
    });
  }
}

async function persistRagProvider(showFeedback = false) {
  skipDevSettingsSync = true;
  try {
    const id = ragProvider.value.trim() || DEFAULT_RAG_PROVIDER;
    await saveSettingsPatch({ ragProvider: id });
    if (showFeedback) setStatus('Provider saved.');
  } finally {
    queueMicrotask(() => {
      skipDevSettingsSync = false;
    });
  }
}

async function syncDevIdentityFromStorage() {
  const s = await loadSettings();
  moderatorId.value = s.moderatorId;
  deviceId.value = s.deviceId;
  fillRagProviderSelect(ragProvider, s.ragProvider);
}

/** Flush text fields before tab hide or batch save (no success toast). */
async function flushPendingOptionsFields() {
  await persistModerateTimeout(false);
  await persistReportShareEmail(false);
  if (!isStoreBuild()) {
    await persistDevIdentity(false);
    await persistCustomOrigin(false);
  }
}

async function syncEnvFromStorage() {
  const s = await loadSettings();
  envProfile.value = s.envProfileId;
  customOrigin.value = s.customApiOrigin || '';
  toggleCustomOrigin();
  await refreshPermissionStatus();
}

async function persistEnvProfile(showFeedback = false) {
  const profileId = /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value);
  if (!(profileId in ENV_PROFILES)) {
    setStatus('Invalid profile.', true);
    return;
  }
  skipEnvSettingsSync = true;
  try {
    await saveSettingsPatch({
      envProfileId: profileId,
      customApiOrigin: customOrigin.value,
    });
    toggleCustomOrigin();
    await refreshPermissionStatus();
    const api = resolveApiConfig(profileId, customOrigin.value);
    if (api.apiOrigin) {
      await ensureHostPermission(api.apiOrigin).catch(() => {});
    }
    if (showFeedback) setStatus('Environment profile saved.');
  } finally {
    queueMicrotask(() => {
      skipEnvSettingsSync = false;
    });
  }
}

async function persistCustomOrigin(showFeedback = false) {
  if (envProfile.value !== 'custom') return;
  skipEnvSettingsSync = true;
  try {
    await saveSettingsPatch({ customApiOrigin: customOrigin.value });
    await refreshPermissionStatus();
    if (showFeedback) setStatus('Custom origin saved.');
  } finally {
    queueMicrotask(() => {
      skipEnvSettingsSync = false;
    });
  }
}

async function loadForm() {
  applyStoreTargetUi();
  const s = await loadSettings();
  if (isStoreBuild() && s.envProfileId !== 'production') {
    await saveSettingsPatch({ envProfileId: 'production', customApiOrigin: '' });
  }
  await syncEnvFromStorage();
  moderateTimeoutSec.value = String(s.moderateTimeoutSec);
  await syncReportSettingsFromStorage();
  await syncDevIdentityFromStorage();
  await syncStatePickerFromStorage();
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
  persistEnvProfile(true).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

customOrigin.addEventListener('input', () => {
  refreshPermissionStatus().catch(() => {});
});

customOrigin.addEventListener('change', () => {
  persistCustomOrigin(true).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

customOrigin.addEventListener('blur', () => {
  persistCustomOrigin(false).catch(() => {});
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

  const emailOk = await persistReportShareEmail(true);
  if (!emailOk) return;

  skipEnvSettingsSync = true;
  skipReportSettingsSync = true;
  skipDevSettingsSync = true;
  try {
    const patch = {
      envProfileId: profileId,
      customApiOrigin: customOrigin.value,
      ragProvider: ragProvider.value.trim() || DEFAULT_RAG_PROVIDER,
      moderateTimeoutSec: parseModerateTimeoutSec(moderateTimeoutSec.value),
      reportShareRecipientEmail: normalizeReportEmail(reportShareEmail.value),
      reportEmailEnabled: reportEmailEnabled.checked,
      reportOpenTabEnabled: reportOpenTabEnabled.checked,
    };
    if (!isStoreBuild()) {
      patch.moderatorId = moderatorId.value.trim();
      patch.deviceId = deviceId.value.trim();
    }
    await saveSettingsPatch(patch);
  } finally {
    queueMicrotask(() => {
      skipEnvSettingsSync = false;
      skipReportSettingsSync = false;
      skipDevSettingsSync = false;
    });
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
  optLocationPicker.setValue(DEFAULT_USER_LOCATION);
  setStatus('Location reset. Open the side panel to confirm location again.');
});

factoryResetBtn.addEventListener('click', async () => {
  const ok = window.confirm(
    'Reset RAG Moderation Assistant to a clean state?\n\n' +
      '• All saved settings will be erased\n' +
      '• Profile will be set to Production\n' +
      '• Granted host permissions for the API will be removed\n' +
      '• You will see feed location and optional report email dialogs again in the side panel',
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
  if (changes.envProfileId || changes.customApiOrigin) {
    if (skipEnvSettingsSync) return;
    syncEnvFromStorage().catch(() => {});
  }
  if (
    changes.reportShareRecipientEmail ||
    changes.reportEmailEnabled ||
    changes.reportOpenTabEnabled
  ) {
    if (skipReportSettingsSync) return;
    syncReportSettingsFromStorage().catch(() => {});
  }
  if (changes.moderatorId || changes.deviceId || changes.ragProvider) {
    if (skipDevSettingsSync) return;
    syncDevIdentityFromStorage().catch(() => {});
  }
  if (changes.moderateTimeoutSec) {
    loadSettings()
      .then((s) => {
        moderateTimeoutSec.value = String(s.moderateTimeoutSec);
      })
      .catch(() => {});
  }
  if (changes.userLocation) {
    if (skipLocationStorageSync) {
      skipLocationStorageSync = false;
      return;
    }
    syncStatePickerFromStorage().catch(() => {});
  }
});

function bindBlurPersist(el, persist) {
  el.addEventListener('blur', () => {
    persist(false).catch(() => {});
  });
}

bindBlurPersist(reportShareEmail, persistReportShareEmail);
if (!isStoreBuild()) {
  bindBlurPersist(moderatorId, persistDevIdentity);
  bindBlurPersist(deviceId, persistDevIdentity);
}
ragProvider.addEventListener('change', () => {
  persistRagProvider(true).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

reportEmailEnabled.addEventListener('change', () => {
  persistReportToggles(true).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

reportOpenTabEnabled.addEventListener('change', () => {
  persistReportToggles(true).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
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
    flushPendingOptionsFields().catch(() => {});
    return;
  }
  syncStatePickerFromStorage().catch(() => {});
  syncReportSettingsFromStorage().catch(() => {});
  syncEnvFromStorage().catch(() => {});
  syncDevIdentityFromStorage().catch(() => {});
  loadSettings()
    .then((s) => {
      moderateTimeoutSec.value = String(s.moderateTimeoutSec);
    })
    .catch(() => {});
});

window.addEventListener('pagehide', () => {
  flushPendingOptionsFields().catch(() => {});
});

async function handleCloseOptions() {
  optLocationPicker.closeList();
  await flushPendingOptionsFields().catch(() => {});
  closeOptionsPageIfOpen()
    .catch(() => {})
    .finally(() => {
      window.close();
    });
}

for (const btn of document.querySelectorAll('.close-options')) {
  btn.addEventListener('click', handleCloseOptions);
}

const optionsVersionEl = document.getElementById('options-version');
if (optionsVersionEl) {
  try {
    optionsVersionEl.textContent = `Extension version ${chrome.runtime.getManifest().version} — close this tab after reloading the extension.`;
  } catch {
    optionsVersionEl.textContent = '';
  }
}

if (ragProvider) {
  fillRagProviderSelect(ragProvider, DEFAULT_RAG_PROVIDER);
}

loadForm().catch((err) => setStatus(err instanceof Error ? err.message : String(err), true));
