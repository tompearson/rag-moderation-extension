import { ENV_PROFILES, resolveApiConfig, formatApiProfileUiLabel } from '../lib/envProfiles.js';
import { ensureGeminiApiPermission, ensureHostPermission } from '../lib/permissions.js';
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
import { isRagProviderId, NON_RAG_V28_PROVIDER } from '../lib/geminiByok.js';
import { notifyExtensionUiSync } from '../lib/extensionUiSync.js';
import { normalizeGeminiApiKey } from '../lib/validateGeminiClient.js';
import { validateGeminiKeyForOptions } from '../lib/validateGeminiRagStyle.js';
import { STORAGE_KEYS } from '../lib/userSettings.js';

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
const geminiApiKeyInput = /** @type {HTMLInputElement} */ (
  document.getElementById('gemini-api-key-input')
);
const geminiRagStyleTest = /** @type {HTMLInputElement} */ (
  document.getElementById('gemini-rag-style-test')
);
const geminiByokEnabled = /** @type {HTMLInputElement} */ (
  document.getElementById('gemini-byok-enabled')
);
const geminiByokEnabledLabel = document.getElementById('gemini-byok-enabled-label');

const GEMINI_BYOK_CHECKBOX_LABEL =
  'Use my key for non-RAG moderations (must be on for Moderate to send your key; Test & save always checks the key with Google)';
const geminiKeySaveBtn = document.getElementById('gemini-key-save');
const geminiKeyRemoveBtn = document.getElementById('gemini-key-remove');
const geminiByokStatus = document.getElementById('gemini-byok-status');
const geminiKeySavedHint = document.getElementById('gemini-key-saved-hint');
const byokRagHint = document.getElementById('byok-rag-hint');

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

function setGeminiByokStatus(msg, isError = false) {
  if (!geminiByokStatus) return;
  geminiByokStatus.textContent = msg || '';
  geminiByokStatus.classList.toggle('error', isError);
}

function updateByokRagHint() {
  if (!byokRagHint || !ragProvider || !geminiByokEnabled) return;
  const showHint = geminiByokEnabled.checked && isRagProviderId(ragProvider.value);
  byokRagHint.classList.toggle('hidden', !showHint);
}

function updateGeminiByokCheckboxLabel(hasKey) {
  if (!geminiByokEnabledLabel) return;
  geminiByokEnabledLabel.textContent = hasKey
    ? `You have a key stored. ${GEMINI_BYOK_CHECKBOX_LABEL}`
    : GEMINI_BYOK_CHECKBOX_LABEL;
}

async function syncGeminiByokFromStorage() {
  const s = await loadSettings();
  if (geminiByokEnabled) geminiByokEnabled.checked = s.geminiByokEnabled;
  const hasKey = (s.geminiApiKey || '').trim().length >= 30;
  updateGeminiByokCheckboxLabel(hasKey);
  if (geminiKeySavedHint) {
    geminiKeySavedHint.classList.toggle('hidden', !hasKey);
  }
  if (geminiApiKeyInput) geminiApiKeyInput.value = '';
  updateByokRagHint();
}

async function persistGeminiByokEnabled(showFeedback = false) {
  await saveSettingsPatch({ geminiByokEnabled: geminiByokEnabled.checked });
  updateByokRagHint();
  if (showFeedback) setGeminiByokStatus('BYOK preference saved.');
}

async function resolveOptionsApiOrigin() {
  const s = await loadSettings();
  const api = resolveApiConfig(s.envProfileId, s.customApiOrigin);
  return api.apiOrigin;
}

async function handleGeminiKeySave() {
  setGeminiByokStatus('');
  let raw = normalizeGeminiApiKey(geminiApiKeyInput?.value || '');
  if (!raw) {
    const stored = normalizeGeminiApiKey((await loadSettings()).geminiApiKey || '');
    if (stored) {
      raw = stored;
      setGeminiByokStatus('Re-testing saved key with Google…');
    } else {
      setGeminiByokStatus('Paste a Gemini API key to test, or save one first.', true);
      return;
    }
  }
  const granted = await ensureGeminiApiPermission();
  if (!granted) {
    setGeminiByokStatus(
      'Allow access to Google Generative Language API to test your key.',
      true,
    );
    return;
  }
  if (!geminiByokStatus.textContent) {
    setGeminiByokStatus('Checking key with Google…');
  }
  geminiKeySaveBtn?.setAttribute('disabled', 'true');
  try {
    const result = await validateGeminiKeyForOptions(raw, {
      ragStyle: !!geminiRagStyleTest?.checked,
    });
    if (!result.valid) {
      const hint =
        result.error?.includes('API key not valid') || result.error?.includes('API key test failed')
          ? ' Create a new key in Google AI Studio if this one was revoked or pasted incompletely.'
          : '';
      setGeminiByokStatus((result.error || 'Key validation failed.') + hint, true);
      return;
    }
    const useForModeration = !!geminiByokEnabled?.checked;
    await saveSettingsPatch({
      geminiApiKey: raw,
      geminiByokEnabled: useForModeration,
      ...(useForModeration ? { ragProvider: NON_RAG_V28_PROVIDER } : {}),
    });
    if (useForModeration && ragProvider) ragProvider.value = NON_RAG_V28_PROVIDER;
    if (geminiApiKeyInput) geminiApiKeyInput.value = '';
    if (geminiKeySavedHint) geminiKeySavedHint.classList.remove('hidden');
    updateGeminiByokCheckboxLabel(true);
    updateByokRagHint();
    const savedMsg = result.message || 'Key saved on this device.';
    setGeminiByokStatus(
      useForModeration
        ? savedMsg
        : `${savedMsg} “Use my key for non-RAG moderations” is off — key stored but not sent on Moderate until you turn it on.`,
    );
    notifyExtensionUiSync();
  } catch (err) {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  } finally {
    geminiKeySaveBtn?.removeAttribute('disabled');
  }
}

async function handleGeminiKeyRemove() {
  await saveSettingsPatch({ geminiApiKey: '', geminiByokEnabled: false });
  if (geminiApiKeyInput) geminiApiKeyInput.value = '';
  if (geminiByokEnabled) geminiByokEnabled.checked = false;
  if (geminiKeySavedHint) geminiKeySavedHint.classList.add('hidden');
  updateGeminiByokCheckboxLabel(false);
  updateByokRagHint();
  setGeminiByokStatus('Key removed from this device.');
  notifyExtensionUiSync();
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
    updateByokRagHint();
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
  await syncGeminiByokFromStorage();
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
  const profileLabel = formatApiProfileUiLabel(api);
  permissionStatus.textContent = has
    ? `Host permission granted for ${profileLabel}`
    : `Permission not granted yet for ${profileLabel}`;
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
    updateByokRagHint();
  }
  if (
    changes[STORAGE_KEYS.geminiApiKey] ||
    changes[STORAGE_KEYS.geminiByokEnabled]
  ) {
    syncGeminiByokFromStorage().catch(() => {});
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

geminiKeySaveBtn?.addEventListener('click', () => {
  handleGeminiKeySave().catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  });
});

geminiKeyRemoveBtn?.addEventListener('click', () => {
  handleGeminiKeyRemove().catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  });
});

geminiByokEnabled?.addEventListener('change', () => {
  persistGeminiByokEnabled(true).catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
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
  syncGeminiByokFromStorage().catch(() => {});
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
