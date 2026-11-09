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
import { postExtensionContact } from '../lib/extensionContactClient.js';
import { buildExtensionContactOptionsSnapshot } from '../lib/extensionContactSettingsSnapshot.js';
import {
  loadLastModerationContactContext,
  serializeLastModerationReportForContact,
} from '../lib/lastModerationContactContext.js';
import { isStoreBuild } from '../lib/buildConfig.js';
import {
  formatGeminiKeySuffixLabel,
  hasSavedGeminiKey,
  isRagProviderId,
  sharedPoolStillWorksSuffix,
  sharedPoolActiveStatusMessage,
} from '../lib/geminiByok.js';
import {
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  EXTENSION_PRIVACY_POLICY_URL,
  EXTENSION_TERMS_URL,
  EXTENSION_HOW_TO_MODERATE_URL,
} from '../lib/geminiKeyUserHelp.js';
import {
  BYOK_CONTINUE_SHARED_POOL,
  FOCUS_GEMINI_KEY_SETUP,
  GEMINI_BYOK_OPTIONS_HASH,
  notifyExtensionUiSync,
} from '../lib/extensionUiSync.js';
import { normalizeGeminiApiKey } from '../lib/validateGeminiClient.js';
import { validateGeminiKeyForOptions } from '../lib/validateGeminiRagStyle.js';
import {
  computeReadinessFromValidateResult,
  GEMINI_KEY_READINESS,
  shouldRunRagStyleProbes,
} from '../lib/geminiKeyReadiness.js';
import { STORAGE_KEYS } from '../lib/userSettings.js';
import { formatExtensionVersionLabel, getExtensionVersion } from '../lib/extensionVersion.js';
import {
  buildSettingsExport,
  downloadSettingsBackup,
  parseSettingsImportFile,
  applySettingsImport,
  formatImportConfirmSummary,
  readSettingsFileAsText,
  GEMINI_RAG_STYLE_TEST_STORAGE,
} from '../lib/settingsBackup.js';

const settingsExportBtn = document.getElementById('settings-export');
const settingsImportBtn = document.getElementById('settings-import');
const settingsImportFile = /** @type {HTMLInputElement | null} */ (
  document.getElementById('settings-import-file')
);

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
const geminiByokEnabledRow = document.getElementById('gemini-byok-enabled-row');
const geminiByokLockedHint = document.getElementById('gemini-byok-locked-hint');
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
const geminiByokSharedPoolRow = document.getElementById('gemini-byok-shared-pool-row');
const geminiByokSharedPoolText = document.getElementById('gemini-byok-shared-pool-text');
const geminiByokContinueSharedPool = document.getElementById('gemini-byok-continue-shared-pool');

const SHARED_POOL_CALLOUT_DISMISS_KEY = 'geminiSharedPoolCalloutDismissed';
const SHARED_POOL_AFTER_REMOVE_KEY = 'geminiSharedPoolAfterRemove';

function isAfterRemoveSharedPoolSession() {
  try {
    return sessionStorage.getItem(SHARED_POOL_AFTER_REMOVE_KEY) === '1';
  } catch {
    return false;
  }
}

function setAfterRemoveSharedPoolSession(active) {
  try {
    if (active) sessionStorage.setItem(SHARED_POOL_AFTER_REMOVE_KEY, '1');
    else sessionStorage.removeItem(SHARED_POOL_AFTER_REMOVE_KEY);
  } catch {
    /* ignore */
  }
}

function isSharedPoolCalloutDismissed() {
  try {
    return sessionStorage.getItem(SHARED_POOL_CALLOUT_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function setSharedPoolCalloutDismissed(dismissed) {
  try {
    if (dismissed) sessionStorage.setItem(SHARED_POOL_CALLOUT_DISMISS_KEY, '1');
    else sessionStorage.removeItem(SHARED_POOL_CALLOUT_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

function updateSharedPoolCalloutCopy() {
  if (!geminiByokSharedPoolText) return;
  geminiByokSharedPoolText.innerHTML =
    'You\u2019re using the <strong>shared pool</strong> (side panel: \u201cYour key \u00b7 Off\u201d). To use your own Google quota, paste a Gemini key below and choose <strong>Save key</strong>. After you save, that key is used for <strong>every</strong> moderation until you <strong>Remove key</strong>.';
}

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

const optionsExtensionContactModal = document.getElementById('options-extension-contact-modal');
const optionsExtensionContactOpen = document.getElementById('options-extension-contact-open');
const optionsExtensionContactMessage = /** @type {HTMLTextAreaElement | null} */ (
  document.getElementById('options-extension-contact-message')
);
const optionsExtensionContactReply = /** @type {HTMLInputElement | null} */ (
  document.getElementById('options-extension-contact-reply')
);
const optionsExtensionContactCharCount = document.getElementById('options-extension-contact-char-count');
const optionsExtensionContactError = document.getElementById('options-extension-contact-error');
const optionsExtensionContactSend = document.getElementById('options-extension-contact-send');
const optionsExtensionContactCancel = document.getElementById('options-extension-contact-cancel');
const optionsExtensionContactClose = document.getElementById('options-extension-contact-close');
const optionsExtensionContactWantReply = /** @type {HTMLInputElement | null} */ (
  document.getElementById('options-extension-contact-want-reply')
);
const optionsExtensionContactEmailRow = document.getElementById('options-extension-contact-email-row');
const optionsExtensionContactSavedEmailNote = document.getElementById('options-extension-contact-saved-email-note');

/** While Options contact modal is open: saved report email existed when modal opened. */
let optionsExtensionContactModalHadSavedEmail = false;

/** @type {ReturnType<typeof setTimeout> | null} */
let optionsExtensionContactReplySaveTimer = null;

function clearOptionsExtensionContactReplySaveTimer() {
  if (optionsExtensionContactReplySaveTimer != null) {
    clearTimeout(optionsExtensionContactReplySaveTimer);
    optionsExtensionContactReplySaveTimer = null;
  }
}

/**
 * Persist Options contact “Your email” to report email once valid (auto-save while typing).
 */
async function maybeSaveOptionsExtensionContactReplyEmail() {
  if (optionsExtensionContactModalHadSavedEmail) return;
  if (!optionsExtensionContactWantReply?.checked) return;
  if (!optionsExtensionContactReply) return;
  const raw = normalizeReportEmail(optionsExtensionContactReply.value);
  if (!raw || !isValidReportEmail(raw)) return;
  let settings = await loadSettings();
  if (normalizeReportEmail(settings.reportShareRecipientEmail || '') === raw) {
    optionsExtensionContactModalHadSavedEmail = true;
    if (reportShareEmail) reportShareEmail.value = raw;
    refreshOptionsExtensionContactSavedEmailNote(raw);
    updateOptionsExtensionContactEmailRowVisibility();
    return;
  }
  try {
    await saveSettingsPatch({
      reportShareRecipientEmail: raw,
      reportEmailPromptComplete: true,
    });
    optionsExtensionContactModalHadSavedEmail = true;
    if (reportShareEmail) reportShareEmail.value = raw;
    refreshOptionsExtensionContactSavedEmailNote(raw);
    updateOptionsExtensionContactEmailRowVisibility();
  } catch {
    // non-fatal
  }
}

function scheduleMaybeSaveOptionsExtensionContactReplyEmail() {
  if (optionsExtensionContactModalHadSavedEmail) return;
  if (!optionsExtensionContactWantReply?.checked) return;
  clearOptionsExtensionContactReplySaveTimer();
  optionsExtensionContactReplySaveTimer = setTimeout(() => {
    optionsExtensionContactReplySaveTimer = null;
    void maybeSaveOptionsExtensionContactReplyEmail();
  }, 500);
}

/**
 * @param {string} savedDisplay
 */
function refreshOptionsExtensionContactSavedEmailNote(savedDisplay) {
  if (!optionsExtensionContactSavedEmailNote) return;
  optionsExtensionContactSavedEmailNote.textContent = `We’ll use your saved report email (${savedDisplay}) when you ask for a direct reply.`;
  optionsExtensionContactSavedEmailNote.classList.remove('hidden');
}

function setOptionsExtensionContactError(msg) {
  if (!optionsExtensionContactError) return;
  if (!msg) {
    optionsExtensionContactError.classList.add('hidden');
    optionsExtensionContactError.textContent = '';
    return;
  }
  optionsExtensionContactError.textContent = msg;
  optionsExtensionContactError.classList.remove('hidden');
}

function updateOptionsExtensionContactCharCount() {
  if (!optionsExtensionContactCharCount || !optionsExtensionContactMessage) return;
  optionsExtensionContactCharCount.textContent = `${optionsExtensionContactMessage.value.length} / 8000`;
}

/**
 * @param {import('../lib/userSettings.js').SettingsSnapshot} settings
 */
function applyOptionsExtensionContactModalOpenState(settings) {
  const saved = normalizeReportEmail(settings.reportShareRecipientEmail || '');
  optionsExtensionContactModalHadSavedEmail = Boolean(saved && isValidReportEmail(saved));

  if (optionsExtensionContactSavedEmailNote) {
    if (optionsExtensionContactModalHadSavedEmail) {
      refreshOptionsExtensionContactSavedEmailNote(saved);
    } else {
      optionsExtensionContactSavedEmailNote.textContent = '';
      optionsExtensionContactSavedEmailNote.classList.add('hidden');
    }
  }

  if (optionsExtensionContactWantReply) {
    optionsExtensionContactWantReply.checked = optionsExtensionContactModalHadSavedEmail;
  }

  updateOptionsExtensionContactEmailRowVisibility();
}

function updateOptionsExtensionContactEmailRowVisibility() {
  const showEmailField =
    !optionsExtensionContactModalHadSavedEmail && Boolean(optionsExtensionContactWantReply?.checked);
  if (optionsExtensionContactEmailRow) {
    optionsExtensionContactEmailRow.classList.toggle('hidden', !showEmailField);
  }
  if (optionsExtensionContactReply && !showEmailField) {
    optionsExtensionContactReply.value = '';
  }
}

async function showOptionsExtensionContactModal() {
  if (!optionsExtensionContactModal) return;
  setOptionsExtensionContactError('');
  let s;
  try {
    s = await loadSettings();
  } catch (err) {
    setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
    return;
  }
  applyOptionsExtensionContactModalOpenState(s);
  if (optionsExtensionContactMessage) optionsExtensionContactMessage.value = '';
  updateOptionsExtensionContactCharCount();
  optionsExtensionContactModal.classList.remove('hidden');
  optionsExtensionContactMessage?.focus();
}

function hideOptionsExtensionContactModal() {
  if (!optionsExtensionContactModal) return;
  clearOptionsExtensionContactReplySaveTimer();
  optionsExtensionContactModal.classList.add('hidden');
  setOptionsExtensionContactError('');
}

async function sendOptionsExtensionContact() {
  if (!optionsExtensionContactSend || !optionsExtensionContactMessage) return;
  setOptionsExtensionContactError('');
  const message = optionsExtensionContactMessage.value.trim();
  if (!message) {
    setOptionsExtensionContactError('Enter a message.');
    return;
  }
  let settings;
  try {
    settings = await loadSettings();
  } catch (err) {
    setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
    return;
  }
  const wantReply = Boolean(optionsExtensionContactWantReply?.checked);
  if (wantReply && !optionsExtensionContactModalHadSavedEmail) {
    await maybeSaveOptionsExtensionContactReplyEmail();
    try {
      settings = await loadSettings();
    } catch (err) {
      setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
      return;
    }
  }
  const saved = normalizeReportEmail(settings.reportShareRecipientEmail || '');
  const hasSaved = Boolean(saved && isValidReportEmail(saved));

  /** @type {string | undefined} */
  let replyEmail;
  if (wantReply && hasSaved && optionsExtensionContactModalHadSavedEmail) {
    replyEmail = saved;
  } else if (wantReply && !hasSaved) {
    const raw = optionsExtensionContactReply?.value.trim() || '';
    if (!raw) {
      setOptionsExtensionContactError(
        'Enter your email for a direct reply, or turn off “I want a direct reply”.',
      );
      return;
    }
    if (!isValidReportEmail(raw)) {
      setOptionsExtensionContactError('Enter a valid email address.');
      return;
    }
    replyEmail = raw;
  } else {
    replyEmail = undefined;
  }

  const api = resolveApiConfig(
    /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value),
    customOrigin.value,
  );
  if (!api.apiOrigin) {
    setOptionsExtensionContactError('Invalid API origin.');
    return;
  }
  const permitted = await ensureHostPermission(api.apiOrigin);
  if (!permitted) {
    setOptionsExtensionContactError(
      `Host permission denied for ${formatApiProfileUiLabel(api)}. Use Grant host permission below.`,
    );
    return;
  }
  optionsExtensionContactSend.disabled = true;
  try {
    const lastCtx = await loadLastModerationContactContext();
    const mergedSettings = {
      ...settings,
      envProfileId: /** @type {import('../lib/envProfiles.js').EnvProfileId} */ (envProfile.value),
      customApiOrigin: customOrigin.value.trim(),
      ragProvider: ragProvider.value,
      moderateTimeoutSec: parseModerateTimeoutSec(moderateTimeoutSec.value),
      reportShareRecipientEmail: reportShareEmail.value.trim(),
      reportEmailEnabled: reportEmailEnabled.checked,
      geminiByokEnabled: Boolean(geminiByokEnabled?.checked),
      moderatorId: moderatorId.value.trim() || settings.moderatorId,
      deviceId: deviceId.value.trim() || settings.deviceId,
      userLocation: optLocationPicker.getValue() || settings.userLocation,
    };
    const optionsSnapshot = buildExtensionContactOptionsSnapshot(mergedSettings, {
      geminiRagStyleTest: Boolean(geminiRagStyleTest?.checked),
    });
    await postExtensionContact(api.apiOrigin, {
      message,
      replyEmail,
      wantsDirectReply: Boolean(replyEmail),
      lastModerationReport: serializeLastModerationReportForContact(lastCtx),
      optionsSnapshot,
    });
    hideOptionsExtensionContactModal();
    setStatus(
      wantReply && replyEmail
        ? 'Message sent. We may reply at your email.'
        : 'Message sent.',
    );
  } catch (err) {
    setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
  } finally {
    optionsExtensionContactSend.disabled = false;
  }
}

optionsExtensionContactOpen?.addEventListener('click', () => {
  showOptionsExtensionContactModal().catch((err) => {
    setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
  });
});
optionsExtensionContactSend?.addEventListener('click', () => {
  sendOptionsExtensionContact().catch((err) => {
    setOptionsExtensionContactError(err instanceof Error ? err.message : String(err));
  });
});
optionsExtensionContactCancel?.addEventListener('click', () => hideOptionsExtensionContactModal());
optionsExtensionContactClose?.addEventListener('click', () => hideOptionsExtensionContactModal());
optionsExtensionContactMessage?.addEventListener('input', () => updateOptionsExtensionContactCharCount());
optionsExtensionContactWantReply?.addEventListener('change', () => {
  if (!optionsExtensionContactWantReply?.checked) {
    clearOptionsExtensionContactReplySaveTimer();
  }
  updateOptionsExtensionContactEmailRowVisibility();
  if (optionsExtensionContactWantReply?.checked) {
    scheduleMaybeSaveOptionsExtensionContactReplyEmail();
  }
});
optionsExtensionContactReply?.addEventListener('input', () => {
  scheduleMaybeSaveOptionsExtensionContactReplyEmail();
});
optionsExtensionContactReply?.addEventListener('blur', () => {
  clearOptionsExtensionContactReplySaveTimer();
  void maybeSaveOptionsExtensionContactReplyEmail();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (optionsExtensionContactModal && !optionsExtensionContactModal.classList.contains('hidden')) {
    hideOptionsExtensionContactModal();
  }
});

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
  const { readiness, summary, details } = computeReadinessFromValidateResult(result);
  geminiByokStatusDetails = details;
  geminiByokDetailsExpanded = false;
  const showSharedPoolHint =
    isError && (readiness === GEMINI_KEY_READINESS.INVALID || result?.valid !== true);
  setGeminiByokStatus(
    showSharedPoolHint ? `${summary}${sharedPoolStillWorksSuffix()}` : summary,
    isError,
  );
  renderGeminiByokDetails();
}

function resolveRagStyleForValidate() {
  const ragSelected = ragProvider ? isRagProviderId(ragProvider.value) : false;
  const advanced = !!geminiRagStyleTest?.checked;
  return shouldRunRagStyleProbes(ragSelected, advanced);
}

const geminiByokSection = document.getElementById('section-gemini-byok');
const geminiByokSectionTitle = document.getElementById('gemini-byok-section-title');

function shouldFocusGeminiKeyFromUrl() {
  const hash = (location.hash || '').replace(/^#/, '');
  return hash === GEMINI_BYOK_OPTIONS_HASH;
}

function focusGeminiKeyInputField() {
  const section = geminiByokSection || document.getElementById('section-gemini-byok');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (!geminiApiKeyInput) return;
  geminiApiKeyInput.classList.add('gemini-key-input--attention');
  try {
    geminiApiKeyInput.focus({ preventScroll: true });
  } catch {
    geminiApiKeyInput.focus();
  }
  window.setTimeout(() => geminiApiKeyInput.classList.remove('gemini-key-input--attention'), 4500);
}

function focusGeminiKeySetupUI() {
  geminiByokSection?.classList.add('gemini-byok-section--attention');
  window.setTimeout(() => geminiByokSection?.classList.remove('gemini-byok-section--attention'), 4500);
  focusGeminiKeyInputField();
  if (!isAfterRemoveSharedPoolSession()) {
    setSharedPoolCalloutDismissed(false);
    updateSharedPoolCalloutCopy();
  }
  updateByokSharedPoolRowVisibility(false);
  setGeminiByokStatus(
    isAfterRemoveSharedPoolSession()
      ? 'Paste a new Gemini API key below, then Save key.'
      : 'Paste your Gemini API key below, then Save key.',
  );
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

function updateByokSharedPoolRowVisibility(hasKey) {
  if (!geminiByokSharedPoolRow) return;
  const afterRemove = !hasKey && isAfterRemoveSharedPoolSession();
  const show =
    !hasKey && !isSharedPoolCalloutDismissed() && !afterRemove;
  if (show) updateSharedPoolCalloutCopy();
  geminiByokSharedPoolRow.classList.toggle('hidden', !show);
  geminiByokSharedPoolRow.hidden = !show;
  if (geminiByokContinueSharedPool) {
    geminiByokContinueSharedPool.hidden = !show;
  }
}

function refreshGeminiKeyStoredUi(hasKey, savedKeyRaw = '') {
  updateByokSharedPoolRowVisibility(hasKey);
  if (geminiByokSectionTitle) {
    if (hasKey) {
      const suffix = formatGeminiKeySuffixLabel(savedKeyRaw);
      geminiByokSectionTitle.textContent = suffix
        ? `Your Gemini API key (saved ${suffix} · in use)`
        : 'Your Gemini API key (saved · in use)';
    } else {
      geminiByokSectionTitle.textContent = 'Your Gemini API key (recommended)';
    }
  }
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
  if (geminiByokEnabledRow) {
    geminiByokEnabledRow.classList.toggle('hidden', hasKey);
    geminiByokEnabledRow.hidden = hasKey;
  }
  if (geminiByokLockedHint) {
    geminiByokLockedHint.classList.toggle('hidden', !hasKey);
    geminiByokLockedHint.hidden = !hasKey;
  }
  if (geminiByokEnabled && hasKey) {
    geminiByokEnabled.checked = true;
  }
  if (geminiKeySavedHint) {
    geminiKeySavedHint.classList.toggle('hidden', !hasKey);
    if (hasKey) {
      const suffix = formatGeminiKeySuffixLabel(savedKeyRaw);
      geminiKeySavedHint.textContent = suffix
        ? `A key is saved (${suffix}). Paste a new key to replace it, or use Remove.`
        : 'A key is saved. Paste a new key to replace it, or use Remove.';
    }
  }
}

/** @param {string} normalizedKey */
function setGeminiKeyPendingPasteStatus(normalizedKey) {
  const suffix = formatGeminiKeySuffixLabel(normalizedKey);
  setGeminiByokStatus(
    suffix
      ? `Key pasted (${suffix}). Choose Save key when ready.`
      : 'Key pasted — choose Save key when ready.',
  );
}

function refreshGeminiKeyPendingStatusFromField() {
  clearGeminiKeyFieldError();
  const normalized = normalizeGeminiApiKey(geminiApiKeyInput?.value || '');
  if (!normalized) {
    const msg = geminiByokStatus?.textContent || '';
    if (msg.startsWith('Key pasted')) {
      setGeminiByokStatus('');
    }
    return;
  }
  if (!hasSavedGeminiKey({ geminiApiKey: normalized })) {
    return;
  }
  setGeminiKeyPendingPasteStatus(normalized);
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
  if (hasSavedGeminiKey({ geminiApiKey: normalized })) {
    setGeminiKeyPendingPasteStatus(normalized);
  }
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
      } else {
        queueMicrotask(() => refreshGeminiKeyPendingStatusFromField());
      }
    });
}

async function syncGeminiByokFromStorage() {
  const s = await loadSettings();
  const hasKey = hasSavedGeminiKey(s);
  if (!hasKey && s.geminiByokEnabled) {
    await saveSettingsPatch({ geminiByokEnabled: false });
  } else if (hasKey && !s.geminiByokEnabled) {
    await saveSettingsPatch({ geminiByokEnabled: true });
  }
  if (geminiByokEnabled) {
    geminiByokEnabled.checked = hasKey;
  }
  refreshGeminiKeyStoredUi(hasKey, s.geminiApiKey);
  if (geminiApiKeyInput) geminiApiKeyInput.value = '';
  if (hasKey) {
    const suffix = formatGeminiKeySuffixLabel(s.geminiApiKey);
    setGeminiByokStatus(suffix ? `Key saved (${suffix}).` : 'Key saved.');
  } else if (isAfterRemoveSharedPoolSession()) {
    setGeminiByokStatus(
      'Key removed — moderations use the shared pool again. Paste a new key below when you want your own quota.',
    );
  }
  if (geminiRagStyleTest) {
    geminiRagStyleTest.checked = localStorage.getItem(GEMINI_RAG_STYLE_TEST_STORAGE) === 'true';
  }
  updateByokRagHint();
}

async function persistGeminiByokEnabled(showFeedback = false) {
  const s = await loadSettings();
  if (hasSavedGeminiKey(s)) {
    return;
  }
  await saveSettingsPatch({ geminiByokEnabled: geminiByokEnabled.checked });
  updateByokRagHint();
  if (showFeedback) {
    setGeminiByokStatus('BYOK preference saved.');
  }
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
  const settingsBeforeSave = await loadSettings();
  let raw = normalizeGeminiApiKey(geminiApiKeyInput?.value || '');
  if (!raw) {
    const stored = normalizeGeminiApiKey(settingsBeforeSave.geminiApiKey || '');
    if (stored) {
      raw = stored;
      setGeminiByokStatus('Re-checking saved key with Google…');
    } else {
      setGeminiKeyFieldError(`You must enter a Gemini API key.${sharedPoolStillWorksSuffix()}`);
      return;
    }
  }
  const granted = await ensureGeminiApiPermission();
  if (!granted) {
    setGeminiByokStatus(
      `Allow access to Google Generative Language API to test your key.${sharedPoolStillWorksSuffix()}`,
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
    await saveSettingsPatch({
      geminiApiKey: raw,
      geminiByokEnabled: true,
    });
    if (geminiApiKeyInput) geminiApiKeyInput.value = '';
    refreshGeminiKeyStoredUi(true, raw);
    if (geminiByokEnabled) {
      geminiByokEnabled.checked = true;
    }
    updateByokRagHint();
    geminiByokStatusDetails = [];
    geminiByokDetailsExpanded = false;
    renderGeminiByokDetails();
    setAfterRemoveSharedPoolSession(false);
    const savedSuffix = formatGeminiKeySuffixLabel(raw);
    setGeminiByokStatus(savedSuffix ? `Key saved (${savedSuffix}).` : 'Key saved.');
    hideGeminiByokTurnOnPrompt();
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
  setAfterRemoveSharedPoolSession(true);
  setSharedPoolCalloutDismissed(true);
  refreshGeminiKeyStoredUi(false);
  updateByokRagHint();
  hideGeminiByokTurnOnPrompt();
  geminiByokStatusDetails = [];
  renderGeminiByokDetails();
  setGeminiByokStatus(
    'Key removed — moderations use the shared pool again. Paste a new key below when you want your own quota.',
  );
  focusGeminiKeyInputField();
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

async function handleSettingsExport() {
  const s = await loadSettings();
  const exportObj = buildSettingsExport(s, {
    extensionVersion: getExtensionVersion() || '',
    geminiRagStyleTest: Boolean(geminiRagStyleTest?.checked),
  });
  downloadSettingsBackup(exportObj);
  setStatus('Settings file downloaded.');
}

/**
 * @param {File} file
 */
async function handleSettingsImportFile(file) {
  const text = await readSettingsFileAsText(file);
  const parsed = parseSettingsImportFile(text);
  if (!window.confirm(formatImportConfirmSummary(parsed))) {
    return;
  }
  await applySettingsImport(parsed);
  if (geminiRagStyleTest) {
    geminiRagStyleTest.checked = parsed.localPrefs.geminiRagStyleTest;
  }
  await loadForm();
  const s = await loadSettings();
  let msg = 'Settings imported.';
  if (s.geminiByokEnabled && !hasSavedGeminiKey(s)) {
    msg += ' Use my key is on but no key is stored—add a key or turn BYOK off.';
  }
  if (!isStoreBuild()) {
    const api = resolveApiConfig(s.envProfileId, s.customApiOrigin);
    if (api.apiOrigin && (s.envProfileId === 'local' || s.envProfileId === 'custom')) {
      await ensureHostPermission(api.apiOrigin).catch(() => {});
      await refreshPermissionStatus();
      msg += ' Use Grant host permission if the API host changed.';
    }
  }
  setStatus(msg);
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

resetLocationBtn.addEventListener('click', async () => {
  await resetUserLocation();
  optLocationPicker.setValue(DEFAULT_USER_LOCATION);
  setStatus('');
});

settingsExportBtn?.addEventListener('click', () => {
  handleSettingsExport().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

settingsImportBtn?.addEventListener('click', () => {
  settingsImportFile?.click();
});

settingsImportFile?.addEventListener('change', async () => {
  const file = settingsImportFile.files?.[0];
  settingsImportFile.value = '';
  if (!file) return;
  try {
    await handleSettingsImportFile(file);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  }
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
  refreshGeminiKeyPendingStatusFromField();
});

geminiApiKeyInput?.addEventListener('paste', () => {
  queueMicrotask(() => refreshGeminiKeyPendingStatusFromField());
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

async function handleDismissSharedPoolCallout() {
  setSharedPoolCalloutDismissed(true);
  updateByokSharedPoolRowVisibility(false);
  updateByokRagHint();
  setGeminiByokStatus('');
  chrome.runtime.sendMessage({ type: BYOK_CONTINUE_SHARED_POOL }).catch(() => {});
}

geminiByokContinueSharedPool?.addEventListener('click', () => {
  handleDismissSharedPoolCallout().catch((err) => {
    setGeminiByokStatus(err instanceof Error ? err.message : String(err), true);
  });
});

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
