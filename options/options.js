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
import {
  formatGeminiKeySuffixLabel,
  hasSavedGeminiKey,
  isRagProviderId,
} from '../lib/geminiByok.js';
import {
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  EXTENSION_PRIVACY_POLICY_URL,
  EXTENSION_TERMS_URL,
  EXTENSION_CONTACT_URL,
  EXTENSION_HOW_TO_MODERATE_URL,
} from '../lib/geminiKeyUserHelp.js';
import {
  FOCUS_GEMINI_KEY_SETUP,
  GEMINI_BYOK_OPTIONS_HASH,
  notifyExtensionUiSync,
} from '../lib/extensionUiSync.js';
import { normalizeGeminiApiKey } from '../lib/validateGeminiClient.js';
import { validateGeminiKeyForOptions } from '../lib/validateGeminiRagStyle.js';
import {
  computeReadinessFromValidateResult,
  shouldRunRagStyleProbes,
} from '../lib/geminiKeyReadiness.js';
import { STORAGE_KEYS } from '../lib/userSettings.js';
import { formatExtensionVersionLabel, getExtensionVersion } from '../lib/extensionVersion.js';

const GEMINI_RAG_STYLE_TEST_STORAGE = 'geminiRagStyleTest';

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

const GEMINI_BYOK_CHECKBOX_LABEL = 'Turn on my key for moderations (recommend)';
const geminiKeyPasteBtn = document.getElementById('gemini-key-paste');
const geminiKeySaveBtn = document.getElementById('gemini-key-save');
const geminiKeyRemoveBtn = document.getElementById('gemini-key-remove');
const geminiByokStatus = document.getElementById('gemini-byok-status');
const geminiKeySavedHint = document.getElementById('gemini-key-saved-hint');
const geminiKeyFieldError = document.getElementById('gemini-key-field-error');
const geminiApiKeyLabel = document.querySelector('label[for="gemini-api-key-input"]');
const geminiKeyGuideLink = document.getElementById('gemini-key-guide-link');
if (geminiKeyGuideLink) {
  geminiKeyGuideLink.href = GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL;
}
const extensionInstallGuideLink = document.getElementById('extension-install-guide-link');
const extensionHowToGuideLink = document.getElementById('extension-how-to-guide-link');
const extensionPrivacyLink = document.getElementById('extension-privacy-link');
const extensionTermsLink = document.getElementById('extension-terms-link');
const extensionContactLink = document.getElementById('extension-contact-link');

function wirePublicGuideLinks() {
  if (extensionInstallGuideLink) {
    extensionInstallGuideLink.href = INSTALL_CHROME_EXTENSION_GUIDE_URL;
  }
  if (extensionHowToGuideLink) {
    extensionHowToGuideLink.href = EXTENSION_HOW_TO_MODERATE_URL;
  }
  if (extensionPrivacyLink) {
    extensionPrivacyLink.href = EXTENSION_PRIVACY_POLICY_URL;
  }
  if (extensionTermsLink) {
    extensionTermsLink.href = EXTENSION_TERMS_URL;
  }
  if (extensionContactLink) {
    extensionContactLink.href = EXTENSION_CONTACT_URL;
  }
}

wirePublicGuideLinks();

const extensionVersionLabel = document.getElementById('extension-version-label');
const versionLabel = formatExtensionVersionLabel();
if (extensionVersionLabel && versionLabel) {
  extensionVersionLabel.textContent = versionLabel;
  extensionVersionLabel.hidden = false;
  extensionVersionLabel.title = `Extension version ${getExtensionVersion() ?? ''}`.trim();
}

function applyStoreTargetGuideLinks() {
  if (!isStoreBuild()) return;
  if (extensionInstallGuideLink) extensionInstallGuideLink.hidden = true;
  if (extensionHowToGuideLink) extensionHowToGuideLink.hidden = false;
}
const byokRagHint = document.getElementById('byok-rag-hint');
const geminiByokDetailsToggle = document.getElementById('gemini-byok-details-toggle');
const geminiByokDetailsList = document.getElementById('gemini-byok-details-list');
const geminiByokTurnOnRow = document.getElementById('gemini-byok-turn-on-row');
const geminiByokTurnOnBtn = document.getElementById('gemini-byok-turn-on');
const geminiByokTurnOnDismiss = document.getElementById('gemini-byok-turn-on-dismiss');

/** @type {string[]} */
let geminiByokStatusDetails = [];
let geminiByokDetailsExpanded = false;

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
  applyStoreTargetGuideLinks();
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

function hideGeminiByokTurnOnPrompt() {
  geminiByokTurnOnRow?.classList.add('hidden');
}

function showGeminiByokTurnOnPrompt() {
  geminiByokTurnOnRow?.classList.remove('hidden');
}

function renderGeminiByokDetails() {
  if (!geminiByokDetailsToggle || !geminiByokDetailsList) return;
  if (!geminiByokStatusDetails.length) {
    geminiByokDetailsToggle.classList.add('hidden');
    geminiByokDetailsList.classList.add('hidden');
    geminiByokDetailsList.replaceChildren();
    return;
  }
  geminiByokDetailsToggle.classList.remove('hidden');
  geminiByokDetailsToggle.textContent = geminiByokDetailsExpanded ? 'Hide details' : 'Details';
  geminiByokDetailsList.classList.toggle('hidden', !geminiByokDetailsExpanded);
  geminiByokDetailsList.replaceChildren(
    ...geminiByokStatusDetails.map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }),
  );
}

function applyGeminiValidateDisplay(result, isError = false) {
  const { summary, details } = computeReadinessFromValidateResult(result);
  geminiByokStatusDetails = details;
  geminiByokDetailsExpanded = false;
  setGeminiByokStatus(summary, isError);
  renderGeminiByokDetails();
}

function resolveRagStyleForValidate() {
  const ragSelected = ragProvider ? isRagProviderId(ragProvider.value) : false;
  const advanced = !!geminiRagStyleTest?.checked;
  return shouldRunRagStyleProbes(ragSelected, advanced);
}

const geminiByokSection = document.getElementById('section-gemini-byok');

function shouldFocusGeminiKeyFromUrl() {
  const hash = (location.hash || '').replace(/^#/, '');
  return hash === GEMINI_BYOK_OPTIONS_HASH;
}

function focusGeminiKeySetupUI() {
  const section = geminiByokSection || document.getElementById('section-gemini-byok');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  section?.classList.add('gemini-byok-section--attention');
  window.setTimeout(() => section?.classList.remove('gemini-byok-section--attention'), 4500);

  if (geminiApiKeyInput) {
    geminiApiKeyInput.classList.add('gemini-key-input--attention');
    try {
      geminiApiKeyInput.focus({ preventScroll: true });
    } catch {
      geminiApiKeyInput.focus();
    }
    window.setTimeout(() => geminiApiKeyInput.classList.remove('gemini-key-input--attention'), 4500);
  }
  setGeminiByokStatus('Paste your Gemini API key below (or use Paste), then choose Save key.');
}

function maybeFocusGeminiKeySetupFromUrl() {
  if (!shouldFocusGeminiKeyFromUrl()) return;
  focusGeminiKeySetupUI();
}

function updateByokRagHint() {
  if (!byokRagHint || !ragProvider || !geminiByokEnabled) return;
  const showHint = geminiByokEnabled.checked && isRagProviderId(ragProvider.value);
  byokRagHint.classList.toggle('hidden', !showHint);
  if (showHint) {
    byokRagHint.textContent =
      'RAG uses your key for search and AI (your Google quota, not the shared pool).';
  }
}

function updateGeminiByokCheckboxLabel(hasKey) {
  if (!geminiByokEnabledLabel) return;
  geminiByokEnabledLabel.textContent = hasKey
    ? `You have a key stored. ${GEMINI_BYOK_CHECKBOX_LABEL}`
    : GEMINI_BYOK_CHECKBOX_LABEL;
}

function clearGeminiKeyFieldError() {
  if (geminiKeyFieldError) {
    geminiKeyFieldError.textContent = '';
    geminiKeyFieldError.classList.add('hidden');
  }
  geminiApiKeyInput?.removeAttribute('aria-invalid');
}

function setGeminiKeyFieldError(message) {
  if (geminiKeyFieldError) {
    geminiKeyFieldError.textContent = message;
    geminiKeyFieldError.classList.remove('hidden');
  }
  if (geminiApiKeyInput) {
    geminiApiKeyInput.setAttribute('aria-invalid', 'true');
    geminiApiKeyInput.classList.add('gemini-key-input--attention');
    window.setTimeout(() => geminiApiKeyInput.classList.remove('gemini-key-input--attention'), 2000);
    geminiApiKeyInput.focus();
  }
}

function refreshGeminiKeyStoredUi(hasKey) {
  if (geminiApiKeyLabel) {
    geminiApiKeyLabel.textContent = hasKey
      ? 'Gemini API key (already added)'
      : 'Gemini API key';
  }
  if (geminiByokEnabled) {
    geminiByokEnabled.disabled = !hasKey;
    if (!hasKey) {
      geminiByokEnabled.checked = false;
    }
  }
  updateGeminiByokCheckboxLabel(hasKey);
  if (geminiKeySavedHint) {
    geminiKeySavedHint.classList.toggle('hidden', !hasKey);
    if (hasKey) {
      geminiKeySavedHint.textContent =
        'A key is saved. Paste a new key to replace it, or use Remove.';
    }
  }
}

function applyGeminiKeyFromClipboardText(text) {
  const normalized = normalizeGeminiApiKey(text || '');
  if (!normalized) {
    setGeminiByokStatus('Clipboard is empty.', true);
    return;
  }
  clearGeminiKeyFieldError();
  if (geminiApiKeyInput) {
    geminiApiKeyInput.value = normalized;
    geminiApiKeyInput.classList.add('gemini-key-input--attention');
    window.setTimeout(() => geminiApiKeyInput.classList.remove('gemini-key-input--attention'), 2000);
  }
  const suffix = formatGeminiKeySuffixLabel(normalized);
  setGeminiByokStatus(
    suffix
      ? `Key pasted (${suffix}). Choose Save key when ready.`
      : 'Key pasted — choose Save key when ready.',
  );
}

function pasteGeminiKeyFromClipboard() {
  setGeminiByokStatus('');
  navigator.clipboard
    .readText()
    .then(applyGeminiKeyFromClipboardText)
    .catch(() => {
      if (geminiApiKeyInput) geminiApiKeyInput.focus();
      const inserted = document.execCommand('paste');
      if (!inserted) {
        setGeminiByokStatus(
          'Paste blocked. Allow clipboard access, reload the extension, or use Ctrl+V in the field.',
          true,
        );
      }
    });
}

async function syncGeminiByokFromStorage() {
  const s = await loadSettings();
  const hasKey = hasSavedGeminiKey(s);
  if (geminiByokEnabled) {
    geminiByokEnabled.checked = hasKey && s.geminiByokEnabled;
  }
  if (!hasKey && s.geminiByokEnabled) {
    await saveSettingsPatch({ geminiByokEnabled: false });
  }
  refreshGeminiKeyStoredUi(hasKey);
  if (geminiApiKeyInput) geminiApiKeyInput.value = '';
  if (geminiRagStyleTest) {
    geminiRagStyleTest.checked = localStorage.getItem(GEMINI_RAG_STYLE_TEST_STORAGE) === 'true';
  }
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
  hideGeminiByokTurnOnPrompt();
  geminiByokStatusDetails = [];
  renderGeminiByokDetails();
  clearGeminiKeyFieldError();
  setGeminiByokStatus('');
  let raw = normalizeGeminiApiKey(geminiApiKeyInput?.value || '');
  if (!raw) {
    const stored = normalizeGeminiApiKey((await loadSettings()).geminiApiKey || '');
    if (stored) {
      raw = stored;
      setGeminiByokStatus('Re-checking saved key with Google…');
    } else {
      setGeminiKeyFieldError('You must enter a Gemini API key.');
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
    setGeminiByokStatus('Checking with Google…');
  }
  geminiKeySaveBtn?.setAttribute('disabled', 'true');
  try {
    const result = await validateGeminiKeyForOptions(raw, {
      ragStyle: resolveRagStyleForValidate(),
    });
    if (!result.valid) {
      applyGeminiValidateDisplay(result, true);
      return;
    }
    const useForModeration = !!geminiByokEnabled?.checked;
    await saveSettingsPatch({
      geminiApiKey: raw,
      geminiByokEnabled: useForModeration,
    });
    if (geminiApiKeyInput) geminiApiKeyInput.value = '';
    refreshGeminiKeyStoredUi(true);
    updateByokRagHint();
    geminiByokStatusDetails = [];
    geminiByokDetailsExpanded = false;
    renderGeminiByokDetails();
    setGeminiByokStatus('');
    if (useForModeration) {
      hideGeminiByokTurnOnPrompt();
    } else {
      showGeminiByokTurnOnPrompt();
    }
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
  refreshGeminiKeyStoredUi(false);
  updateByokRagHint();
  hideGeminiByokTurnOnPrompt();
  geminiByokStatusDetails = [];
  renderGeminiByokDetails();
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
}

async function persistReportToggles(showFeedback = false) {
  skipReportSettingsSync = true;
  try {
    await saveSettingsPatch({
      reportEmailEnabled: reportEmailEnabled.checked,
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
  maybeFocusGeminiKeySetupFromUrl();
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
  setStatus('');
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
  if (changes.reportShareRecipientEmail || changes.reportEmailEnabled) {
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

geminiKeyPasteBtn?.addEventListener('click', () => {
  pasteGeminiKeyFromClipboard();
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
  if (geminiByokEnabled.disabled) return;
  persistGeminiByokEnabled(true).catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  });
});

geminiApiKeyInput?.addEventListener('input', () => {
  clearGeminiKeyFieldError();
});

geminiRagStyleTest?.addEventListener('change', () => {
  localStorage.setItem(
    GEMINI_RAG_STYLE_TEST_STORAGE,
    geminiRagStyleTest.checked ? 'true' : 'false',
  );
});

geminiByokDetailsToggle?.addEventListener('click', () => {
  geminiByokDetailsExpanded = !geminiByokDetailsExpanded;
  renderGeminiByokDetails();
});

geminiByokTurnOnBtn?.addEventListener('click', () => {
  if (geminiByokEnabled) geminiByokEnabled.checked = true;
  hideGeminiByokTurnOnPrompt();
  persistGeminiByokEnabled(true).catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  });
});

geminiByokTurnOnDismiss?.addEventListener('click', () => {
  hideGeminiByokTurnOnPrompt();
});

reportEmailEnabled.addEventListener('change', () => {
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

if (ragProvider) {
  fillRagProviderSelect(ragProvider, DEFAULT_RAG_PROVIDER);
}

loadForm().catch((err) => setStatus(err instanceof Error ? err.message : String(err), true));

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === FOCUS_GEMINI_KEY_SETUP) {
    focusGeminiKeySetupUI();
  }
});

window.addEventListener('hashchange', () => {
  maybeFocusGeminiKeySetupFromUrl();
});
