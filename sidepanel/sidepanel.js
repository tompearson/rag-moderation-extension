import {
  loadSettings,
  saveSettingsPatch,
  saveUserLocation,
  hasValidUserLocation,
  isFeedLocationConfirmed,
  shouldShowReportEmailPrompt,
} from '../lib/userSettings.js';
import { normalizeReportEmail, isValidReportEmail } from '../lib/validateReportEmail.js';
import {
  resolveReportViewUrl,
  hasSavedReportForActions,
  normalizeModerationHistoryId,
} from '../lib/reportViewUrl.js';
import {
  isModerationFailureResult,
  moderationFailureStatusMessage,
  isGeminiQuotaOrBillingIssue,
  GOOGLE_AI_STUDIO_KEYS_URL,
  geminiQuotaResultsHintHtml,
  sanitizeModerationReason,
} from '../lib/moderationResult.js';
import { postShareReportEmail } from '../lib/shareReportEmailClient.js';
import { fetchFeedbackExists, postSubmitFeedback } from '../lib/submitFeedbackClient.js';
import { getOrCreateFeedbackSessionId } from '../lib/feedbackSession.js';
import {
  DEFAULT_USER_LOCATION,
  canonicalUsState,
  resolveStoredUserLocation,
} from '../lib/usStates.js';
import { createStatePicker } from '../lib/statePicker.js';
import { resolveApiConfig, formatApiProfileUiLabel } from '../lib/envProfiles.js';
import {
  byokQuotaWithSharedPoolHint,
  hasSavedGeminiKey,
  isByokConfigured,
  isLikelyGeminiKeyAuthFailure,
  sharedPoolActiveStatusMessage,
  shouldClearByokWithoutKey,
  switchedToSharedPoolStatusMessage,
} from '../lib/geminiByok.js';
import {
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  EXTENSION_CONTACT_URL,
} from '../lib/geminiKeyUserHelp.js';
import { isStoreBuild } from '../lib/buildConfig.js';
import { formatExtensionVersionLabel, getExtensionVersion } from '../lib/extensionVersion.js';
import { STORAGE_KEYS } from '../lib/userSettings.js';
import { ensureHostPermission } from '../lib/permissions.js';
import { openOptionsPage, toggleOptionsPage } from '../lib/optionsPage.js';
import { BYOK_CONTINUE_SHARED_POOL, EXTENSION_UI_SYNC } from '../lib/extensionUiSync.js';
import {
  PENDING_DRAFT_SESSION_KEY,
  consumePendingModerationDraft,
} from '../lib/pendingModerationDraft.js';
import { prepareTabCaptureFromSidePanel } from '../lib/prepareTabCapture.js';
import {
  decisionClass,
  formatReportCategory,
  renderRagSourcesFoldHtml,
  renderContextImpactHtml,
  escapeHtml,
} from '../lib/formatters.js';

const modal = document.getElementById('location-modal');
const modalError = document.getElementById('modal-error');
const modalSave = document.getElementById('modal-save');
const reportEmailModal = document.getElementById('report-email-modal');
const reportEmailInput = /** @type {HTMLInputElement} */ (document.getElementById('report-email-input'));
const reportEmailError = document.getElementById('report-email-error');
const reportEmailSave = document.getElementById('report-email-save');
const reportEmailNotNow = document.getElementById('report-email-not-now');
const reportEmailClose = document.getElementById('report-email-close');
const reportEmailModalTitle = document.getElementById('report-email-modal-title');
const reportEmailModalDesc = document.getElementById('report-email-modal-desc');
const reportEmailModalCard = reportEmailModal?.querySelector('.modal-card');
const reportEmailRemoveRow = document.getElementById('report-email-remove-row');
const reportEmailRemove = document.getElementById('report-email-remove');
const reviewDecisionModal = document.getElementById('review-decision-modal');
const reviewDecisionInput = /** @type {HTMLTextAreaElement} */ (
  document.getElementById('review-decision-input')
);
const reviewDecisionError = document.getElementById('review-decision-error');
const reviewDecisionPreflight = document.getElementById('review-decision-preflight');
const reviewDecisionCharCount = document.getElementById('review-decision-char-count');
const reviewDecisionSend = document.getElementById('review-decision-send');
const reviewDecisionCancel = document.getElementById('review-decision-cancel');
const reviewDecisionClose = document.getElementById('review-decision-close');
const reviewDecisionThumbUp = document.getElementById('review-decision-thumb-up');
const reviewDecisionThumbDown = document.getElementById('review-decision-thumb-down');
const mainPanel = document.getElementById('main-panel');
const connectionBadge = document.getElementById('connection-badge');
const byokBadge = document.getElementById('byok-badge');
const installExtensionGuideLink = document.getElementById('install-extension-guide-link');
const geminiKeyGuideLink = document.getElementById('gemini-key-guide-link');
const sidepanelContactLink = document.getElementById('extension-contact-link');
const sidepanelGuideSepInstall = document.getElementById('sidepanel-guide-sep-install');

if (installExtensionGuideLink) {
  installExtensionGuideLink.href = INSTALL_CHROME_EXTENSION_GUIDE_URL;
}
if (geminiKeyGuideLink) {
  geminiKeyGuideLink.href = GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL;
}
if (sidepanelContactLink) {
  sidepanelContactLink.href = EXTENSION_CONTACT_URL;
}
if (isStoreBuild()) {
  if (installExtensionGuideLink) installExtensionGuideLink.hidden = true;
  if (sidepanelGuideSepInstall) sidepanelGuideSepInstall.hidden = true;
}

const extensionVersionLabel = document.getElementById('extension-version-label');
const versionLabel = formatExtensionVersionLabel();
if (extensionVersionLabel && versionLabel) {
  extensionVersionLabel.textContent = versionLabel;
  extensionVersionLabel.hidden = false;
  extensionVersionLabel.title = `Extension version ${getExtensionVersion() ?? ''}`.trim();
}
const modalLocationPicker = createStatePicker(document.getElementById('modal-location'), {
  initialValue: DEFAULT_USER_LOCATION,
  triggerId: 'modal-location-trigger',
});
const locationPicker = createStatePicker(document.getElementById('user-location'), {
  initialValue: DEFAULT_USER_LOCATION,
  triggerId: 'user-location-trigger',
});
const contentInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('content'));
const pasteContentBtn = document.getElementById('paste-content-btn');
const pickContentBtn = document.getElementById('pick-content-btn');
const postContextDetails = document.getElementById('post-context-details');
const postContextInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('post-context'));
const analysisSelect = /** @type {HTMLSelectElement} */ (document.getElementById('analysis-type'));
const badWordsCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('bad-words-enabled'));
const moderateBtn = document.getElementById('moderate-btn');
const MODERATE_BTN_PROMPT_CLASS = 'moderate-btn-prompt';
const clearBtn = document.getElementById('clear-btn');
const moderationProgress = document.getElementById('moderation-progress');
const moderationElapsed = document.getElementById('moderation-elapsed');
const moderationLimit = document.getElementById('moderation-limit');
const abortModerateBtn = document.getElementById('abort-moderate-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

/** @type {ReturnType<typeof setInterval> | null} */
let moderationElapsedTimer = null;
/** @type {string | null} */
let activeModerationRequestId = null;

/** @type {{
 *   moderationHistoryId: string | null;
 *   moderationReportUrl: string | null;
 *   apiOrigin: string | null;
 *   provider: string | null;
 *   analysisType: string | null;
 * }} */
let lastReportContext = {
  moderationHistoryId: null,
  moderationReportUrl: null,
  apiOrigin: null,
  provider: null,
  analysisType: null,
};

/** @type {boolean} */
let reviewDecisionSubmitBlocked = false;

/** @type {1 | -1 | null} */
let reviewDecisionRating = null;

/** Fingerprint of last successful moderation (skip duplicate API runs). */
/** @type {string | null} */
let lastSuccessfulModerationKey = null;

/**
 * @param {string} content
 * @param {string} postContext
 * @param {string} analysisType
 * @param {boolean} badWordsEnabled
 */
function moderationRequestKey(content, postContext, analysisType, badWordsEnabled) {
  return JSON.stringify({
    c: content,
    p: postContext.trim(),
    a: analysisType,
    b: badWordsEnabled,
  });
}

/** @type {'onboarding' | 'sendReport'} */
let reportEmailModalMode = 'onboarding';
/** @type {HTMLButtonElement | null} */
let pendingEmailReportButton = null;

function setPickerValues(value) {
  const resolved = resolveStoredUserLocation(value);
  modalLocationPicker.setValue(resolved);
  locationPicker.setValue(resolved);
}

function statePickerBusy() {
  return modalLocationPicker.isListOpen() || locationPicker.isListOpen();
}

function syncMainPanelBlocked() {
  const locationOpen = modal && !modal.classList.contains('hidden');
  const emailOpen = reportEmailModal && !reportEmailModal.classList.contains('hidden');
  const reviewOpen = reviewDecisionModal && !reviewDecisionModal.classList.contains('hidden');
  const blocked = locationOpen || emailOpen || reviewOpen;
  mainPanel.classList.toggle('blocked', blocked);
  mainPanel.setAttribute('aria-hidden', blocked ? 'true' : 'false');
}

function showLocationModal(show) {
  modal.classList.toggle('hidden', !show);
  syncMainPanelBlocked();
  if (show) {
    abortPickMode();
    modalLocationPicker.focus();
  }
}

function setReportEmailModalError(msg) {
  if (!reportEmailError) return;
  if (!msg) {
    reportEmailError.classList.add('hidden');
    reportEmailError.textContent = '';
    return;
  }
  reportEmailError.textContent = msg;
  reportEmailError.classList.remove('hidden');
}

function setReportEmailRemoveVisible(show) {
  if (!reportEmailRemoveRow) return;
  reportEmailRemoveRow.classList.toggle('hidden', !show);
  reportEmailRemoveRow.hidden = !show;
}

function applyReportEmailModalMode(mode, { hasSavedEmail = false } = {}) {
  reportEmailModalMode = mode;
  reportEmailModalCard?.classList.toggle('email-send-mode', mode === 'sendReport');
  if (mode === 'sendReport') {
    if (reportEmailModalTitle) reportEmailModalTitle.textContent = 'Email report';
    if (reportEmailModalDesc) {
      reportEmailModalDesc.textContent =
        'Edit the address, clear the field to type a new one, or remove the saved email below. Send saves the address and emails this report.';
    }
    if (reportEmailSave) {
      reportEmailSave.textContent = 'Send it';
      reportEmailSave.classList.add('primary');
    }
    if (reportEmailNotNow) reportEmailNotNow.textContent = 'Cancel';
    setReportEmailRemoveVisible(hasSavedEmail);
  } else {
    if (reportEmailModalTitle) reportEmailModalTitle.textContent = 'Report email (optional)';
    if (reportEmailModalDesc) {
      reportEmailModalDesc.textContent =
        'Used when you click Email report on a saved moderation result. You can add or change this later in Options.';
    }
    if (reportEmailSave) {
      reportEmailSave.textContent = 'Save';
      reportEmailSave.classList.add('primary');
    }
    if (reportEmailNotNow) reportEmailNotNow.textContent = 'Not now';
    setReportEmailRemoveVisible(false);
  }
}

function closeReportEmailModal() {
  pendingEmailReportButton = null;
  applyReportEmailModalMode('onboarding');
  showReportEmailModal(false);
}

function showReportEmailModal(show) {
  if (!reportEmailModal) return;
  reportEmailModal.classList.toggle('hidden', !show);
  syncMainPanelBlocked();
  if (show) {
    setReportEmailModalError('');
    reportEmailInput.focus();
  }
}

async function maybeShowReportEmailModal() {
  const settings = await loadSettings();
  if (!shouldShowReportEmailPrompt(settings)) {
    closeReportEmailModal();
    syncMainPanelBlocked();
    return;
  }
  applyReportEmailModalMode('onboarding');
  reportEmailInput.value = settings.reportShareRecipientEmail || '';
  showReportEmailModal(true);
}

async function dismissReportEmailPrompt() {
  await saveSettingsPatch({ reportEmailPromptComplete: true });
  closeReportEmailModal();
}

async function dismissReportEmailModal() {
  if (reportEmailModalMode === 'sendReport') {
    closeReportEmailModal();
    return;
  }
  await dismissReportEmailPrompt();
}

async function removeSavedReportEmailFromModal() {
  setReportEmailModalError('');
  await saveSettingsPatch({ reportShareRecipientEmail: '' });
  reportEmailInput.value = '';
  setReportEmailRemoveVisible(false);
  setStatus('Saved report email removed.');
  closeReportEmailModal();
}

async function saveReportEmailFromModal() {
  setReportEmailModalError('');
  const raw = normalizeReportEmail(reportEmailInput.value);
  if (reportEmailModalMode === 'sendReport') {
    if (!raw || !isValidReportEmail(raw)) {
      setReportEmailModalError('Enter a valid email address.');
      return;
    }
    await saveSettingsPatch({
      reportShareRecipientEmail: raw,
      reportEmailPromptComplete: true,
    });
    const button = pendingEmailReportButton;
    closeReportEmailModal();
    await sendEmailReportFlow(button, raw);
    return;
  }
  if (raw && !isValidReportEmail(raw)) {
    setReportEmailModalError('Enter a valid email address or leave blank.');
    return;
  }
  await saveSettingsPatch({
    reportShareRecipientEmail: raw,
    reportEmailPromptComplete: true,
  });
  closeReportEmailModal();
}

function setModalError(msg) {
  if (!msg) {
    modalError.classList.add('hidden');
    modalError.textContent = '';
    return;
  }
  modalError.textContent = msg;
  modalError.classList.remove('hidden');
}

async function refreshConnectionBadge() {
  const settings = await loadSettings();
  const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
  connectionBadge.textContent = formatApiProfileUiLabel(api);
  await refreshByokBadge(settings);
}

async function refreshSharedPoolStatusHint() {
  if (!statusEl) return;
  if (activeModerationRequestId != null) return;
  const settings = await loadSettings();
  if (hasSavedGeminiKey(settings)) return;
  setInfoStatus(sharedPoolActiveStatusMessage());
}

async function refreshByokBadge(settingsIn) {
  if (!byokBadge) return;
  const settings = settingsIn || (await loadSettings());
  const hasKey = hasSavedGeminiKey(settings);
  const on = isByokConfigured(settings);

  byokBadge.classList.remove('hidden', 'byok-badge--on', 'byok-badge--off', 'byok-badge--no-key');
  byokBadge.hidden = false;

  if (on) {
    byokBadge.classList.add('byok-badge--on');
    byokBadge.textContent = 'Your key · On';
    byokBadge.title = 'Moderations use your Gemini key — click to turn off';
    byokBadge.setAttribute('aria-pressed', 'true');
  } else if (hasKey) {
    byokBadge.classList.add('byok-badge--off');
    byokBadge.textContent = 'Your key · Off';
    byokBadge.title = 'Saved key not used — click to turn on';
    byokBadge.setAttribute('aria-pressed', 'false');
  } else {
    byokBadge.classList.add('byok-badge--off', 'byok-badge--no-key');
    byokBadge.textContent = 'Your key · Off';
    byokBadge.title = `Moderations use the shared pool — click for details (optional: add your key in Options)`;
    byokBadge.setAttribute('aria-pressed', 'false');
  }
}

async function handleByokBadgeClick() {
  const settings = await loadSettings();
  const hasKey = hasSavedGeminiKey(settings);
  const on = isByokConfigured(settings);

  if (!hasKey) {
    try {
      if (shouldClearByokWithoutKey(settings)) {
        await saveSettingsPatch({ geminiByokEnabled: false });
      }
      setInfoStatus(sharedPoolActiveStatusMessage());
      await refreshByokBadge(await loadSettings());
      await openOptionsPage({ focusGeminiKey: true });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    }
    return;
  }

  try {
    if (on) {
      await saveSettingsPatch({ geminiByokEnabled: false });
      setStatus('Your key is off — moderations use the shared pool.');
    } else {
      await saveSettingsPatch({ geminiByokEnabled: true });
      setStatus('Your key is on for moderations.');
    }
    await refreshByokBadge(await loadSettings());
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  }
}

/** Pull latest settings into header badges, location picker, etc. */
async function syncSidePanelFromStorage() {
  const settings = await loadSettings();
  if (shouldClearByokWithoutKey(settings)) {
    await saveSettingsPatch({ geminiByokEnabled: false });
  }
  await refreshConnectionBadge();
  await refreshSharedPoolStatusHint();
  const refreshed = await loadSettings();
  if (!statePickerBusy() && hasValidUserLocation(refreshed.userLocation)) {
    setPickerValues(refreshed.userLocation);
  }
}

async function maybeMigrateStoredLocation(settings) {
  const raw = settings.userLocation;
  if (!raw) return;
  const canonical = canonicalUsState(raw);
  if (canonical && canonical !== raw) {
    await saveUserLocation(canonical, { onboarding: settings.locationOnboardingComplete });
  }
}

async function initLocationUi() {
  const settings = await loadSettings();
  await maybeMigrateStoredLocation(settings);
  const refreshed = await loadSettings();

  if (!isFeedLocationConfirmed(refreshed)) {
    setPickerValues(refreshed.userLocation);
    showLocationModal(true);
    showReportEmailModal(false);
    return;
  }

  setPickerValues(refreshed.userLocation);
  showLocationModal(false);
  await maybeShowReportEmailModal();
}

modalSave.addEventListener('click', async () => {
  setModalError('');
  modalLocationPicker.closeList();
  const selected = modalLocationPicker.getValue();
  try {
    await saveUserLocation(selected, { onboarding: true });
    locationPicker.setValue(selected);
    showLocationModal(false);
    await maybeShowReportEmailModal();
  } catch (err) {
    setModalError(err instanceof Error ? err.message : String(err));
  }
});

reportEmailSave?.addEventListener('click', () => {
  saveReportEmailFromModal().catch((err) => {
    setReportEmailModalError(err instanceof Error ? err.message : String(err));
  });
});

reportEmailNotNow?.addEventListener('click', () => {
  dismissReportEmailModal().catch((err) => {
    setReportEmailModalError(err instanceof Error ? err.message : String(err));
  });
});

reportEmailClose?.addEventListener('click', () => {
  dismissReportEmailModal().catch((err) => {
    setReportEmailModalError(err instanceof Error ? err.message : String(err));
  });
});

reportEmailRemove?.addEventListener('click', () => {
  removeSavedReportEmailFromModal().catch((err) => {
    setReportEmailModalError(err instanceof Error ? err.message : String(err));
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (reviewDecisionModal && !reviewDecisionModal.classList.contains('hidden')) {
    e.preventDefault();
    closeReviewDecisionModal();
    return;
  }
  if (reportEmailModal && !reportEmailModal.classList.contains('hidden')) {
    e.preventDefault();
    dismissReportEmailModal().catch(() => {});
  }
});

reviewDecisionCancel?.addEventListener('click', () => closeReviewDecisionModal());
reviewDecisionClose?.addEventListener('click', () => closeReviewDecisionModal());
reviewDecisionSend?.addEventListener('click', () => {
  sendReviewDecisionFromModal().catch((err) => {
    setReviewDecisionError(err instanceof Error ? err.message : String(err));
  });
});
reviewDecisionInput?.addEventListener('input', () => updateReviewDecisionCharCount());
reviewDecisionThumbUp?.addEventListener('click', () => {
  setReviewDecisionRating(reviewDecisionRating === 1 ? null : 1);
});
reviewDecisionThumbDown?.addEventListener('click', () => {
  setReviewDecisionRating(reviewDecisionRating === -1 ? null : -1);
});

locationPicker.onChange(async (selected) => {
  const settings = await loadSettings();
  if (settings.userLocation === selected) return;
  try {
    await saveUserLocation(selected, { onboarding: settings.locationOnboardingComplete });
  } catch {
    locationPicker.setValue(settings.userLocation || DEFAULT_USER_LOCATION);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.userLocation && !statePickerBusy()) {
    const next = changes.userLocation.newValue;
    if (hasValidUserLocation(next)) setPickerValues(next);
  }
  if (
    changes.envProfileId ||
    changes.customApiOrigin ||
    changes[STORAGE_KEYS.geminiApiKey] ||
    changes[STORAGE_KEYS.geminiByokEnabled] ||
    changes[STORAGE_KEYS.ragProvider]
  ) {
    syncSidePanelFromStorage().catch(() => {});
  }
  if (changes.userLocation || changes.locationOnboardingComplete) {
    loadSettings().then((s) => {
      if (!isFeedLocationConfirmed(s)) {
        abortPickMode();
        if (!statePickerBusy()) setPickerValues(s.userLocation);
        showLocationModal(true);
        showReportEmailModal(false);
        refreshByokBadge(s).catch(() => {});
      }
    }).catch(() => {});
  }
});

function setStatus(msg, isError = false) {
  statusEl.classList.remove('status-info');
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', isError);
}

/** Non-error guidance under Moderate (e.g. borrowed key / no BYOK). */
function setInfoStatus(msg) {
  statusEl.classList.remove('error');
  statusEl.classList.add('status-info');
  statusEl.textContent = msg || '';
}

function setGeminiQuotaHelpStatus(byokWasOn = false) {
  statusEl.classList.remove('status-info');
  statusEl.classList.add('error');
  statusEl.replaceChildren();
  if (byokWasOn) {
    statusEl.append(document.createTextNode(`${byokQuotaWithSharedPoolHint()} `));
  } else {
    statusEl.append(
      document.createTextNode(
        'Gemini API quota exceeded. Try again later. Manage or create a key in ',
      ),
    );
  }
  const link = document.createElement('a');
  link.href = GOOGLE_AI_STUDIO_KEYS_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Google AI Studio';
  statusEl.append(link);
  statusEl.append(document.createTextNode(byokWasOn ? '' : '.'));
}

/** @param {string} message */
function setErrorStatus(message) {
  const msg = sanitizeModerationReason(message);
  if (isGeminiQuotaOrBillingIssue(msg)) {
    setGeminiQuotaHelpStatus();
    return;
  }
  setStatus(msg, true);
}

function currentModerationRequestKey() {
  return moderationRequestKey(
    contentInput.value.trim(),
    postContextInput.value.trim(),
    analysisSelect.value,
    badWordsCheckbox.checked,
  );
}

function isModerateReadyToPrompt() {
  if (!(moderateBtn instanceof HTMLButtonElement) || moderateBtn.disabled) return false;
  if (!contentInput.value.trim()) return false;
  if (activeModerationRequestId) return false;
  return currentModerationRequestKey() !== lastSuccessfulModerationKey;
}

function applyModerateBtnPromptClass(on) {
  if (!(moderateBtn instanceof HTMLButtonElement)) return;
  moderateBtn.classList.toggle(MODERATE_BTN_PROMPT_CLASS, on);
}

function stopModerateBtnPrompt() {
  applyModerateBtnPromptClass(false);
}

function updateModerateBtnPrompt() {
  applyModerateBtnPromptClass(isModerateReadyToPrompt());
}

function startModerationProgress(timeoutSec) {
  abortPickMode();
  stopModerateBtnPrompt();
  moderationProgress.classList.remove('hidden');
  moderationLimit.textContent = `/ ${timeoutSec}s max`;
  moderationElapsed.textContent = '0.0s';
  const started = performance.now();
  if (moderationElapsedTimer) clearInterval(moderationElapsedTimer);
  moderationElapsedTimer = setInterval(() => {
    const sec = (performance.now() - started) / 1000;
    moderationElapsed.textContent = `${sec.toFixed(1)}s`;
  }, 100);
  abortModerateBtn.disabled = false;
  moderateBtn.disabled = true;
  syncPickContentButton();
}

function stopModerationProgress() {
  if (moderationElapsedTimer) {
    clearInterval(moderationElapsedTimer);
    moderationElapsedTimer = null;
  }
  moderationProgress.classList.add('hidden');
  activeModerationRequestId = null;
  moderateBtn.disabled = false;
  abortModerateBtn.disabled = true;
  syncPickContentButton();
  updateModerateBtnPrompt();
}

/**
 * @param {string} label
 * @param {string} bodyId
 * @param {string} plainText
 */
const REVIEW_THIS_REPORT_LABEL = 'Review this report';

/**
 * @param {string} decision
 */
function decisionResultBlock(decision) {
  const text = escapeHtml(decision);
  const cls = decisionClass(decision);
  return `
    <div class="copy-block decision-result-block">
      <div class="copy-block-header">
        <span class="copy-block-label">Decision</span>
      </div>
      <p class="decision ${cls}" id="result-decision">${text}</p>
    </div>
  `;
}

function copyBlockSection(label, bodyId, plainText) {
  const body = escapeHtml(plainText);
  return `
    <div class="copy-block">
      <div class="copy-block-header">
        <span class="copy-block-label">${escapeHtml(label)}</span>
        <button type="button" class="copy-btn" data-for="${bodyId}" aria-label="Copy ${escapeHtml(label)} to clipboard">Copy</button>
      </div>
      <p class="copy-block-body" id="${bodyId}">${body}</p>
    </div>
  `;
}

async function copyElementTextToClipboard(elementId, button) {
  const el = document.getElementById(elementId);
  const text = el?.textContent?.trim() ?? '';
  if (!text) {
    setStatus('Nothing to copy.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  if (button instanceof HTMLButtonElement) {
    const prev = button.textContent;
    button.textContent = 'Copied';
    button.disabled = true;
    setTimeout(() => {
      button.textContent = prev;
      button.disabled = false;
    }, 1500);
  }
}

/**
 * @param {Record<string, unknown>} result
 * @param {string | null} apiOrigin
 * @param {{ reportEmailEnabled: boolean; reportOpenTabEnabled: boolean }} flags
 */
function buildReportActionsHtml(result, apiOrigin, flags) {
  if (!hasSavedReportForActions(result)) {
    return (
      `<p class="muted report-actions-hint">No saved report from the API — <strong>${REVIEW_THIS_REPORT_LABEL}</strong> and report buttons need a stored record. Use <strong>Production</strong> (or local Universal with <code>AUTO_SAVE_TO_DB=true</code> and Supabase), then moderate again.</p>`
    );
  }

  const historyId = normalizeModerationHistoryId(result.moderationHistoryId);
  const reportUrl =
    typeof result.moderationReportUrl === 'string' ? result.moderationReportUrl.trim() : '';
  const openUrl = resolveReportViewUrl({
    apiOrigin,
    moderationHistoryId: historyId,
    moderationReportUrl: reportUrl,
  });
  const canOpen = !!openUrl;
  const canEmail = flags.reportEmailEnabled && historyId;
  const canReview = !!historyId;

  if (!canOpen && !canEmail && !canReview) {
    return (
      '<p class="muted report-actions-hint">Turn on <strong>Email report</strong> under Options → Saved full report if you want email.</p>'
    );
  }

  const parts = ['<div class="report-actions">'];
  if (canOpen) {
    parts.push(
      '<button type="button" class="secondary small-btn open-report-btn">Open full report</button>',
    );
  }
  if (canEmail) {
    parts.push(
      '<button type="button" class="secondary small-btn email-report-btn">Email report</button>',
    );
  }
  if (canReview) {
    parts.push(
      `<button type="button" class="secondary small-btn review-decision-btn">${REVIEW_THIS_REPORT_LABEL}</button>`,
    );
  }
  parts.push('</div>');
  return parts.join('');
}

/**
 * @param {Record<string, unknown>} result
 * @param {string | null | undefined} apiOrigin
 */
/**
 * @param {Record<string, unknown>} result
 * @returns {string | null}
 */
function providerNameFromResult(result) {
  const p = result.provider;
  if (p && typeof p === 'object') {
    const name = /** @type {{ name?: string }} */ (p).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  if (typeof p === 'string' && p.trim()) return p.trim();
  return null;
}

/**
 * @param {Record<string, unknown>} result
 * @returns {string | null}
 */
function analysisTypeFromResult(result) {
  const fromResult = result.analysisType;
  if (typeof fromResult === 'string' && fromResult.trim()) return fromResult.trim();
  return analysisSelect?.value || null;
}

function rememberReportContext(result, apiOrigin) {
  const historyId = normalizeModerationHistoryId(result.moderationHistoryId);
  const reportUrl =
    typeof result.moderationReportUrl === 'string' ? result.moderationReportUrl.trim() : '';
  lastReportContext = {
    moderationHistoryId: historyId,
    moderationReportUrl: reportUrl || null,
    apiOrigin: apiOrigin || null,
    provider: providerNameFromResult(result),
    analysisType: analysisTypeFromResult(result),
  };
}

function syncReviewDecisionThumbButtons() {
  const upSelected = reviewDecisionRating === 1;
  const downSelected = reviewDecisionRating === -1;
  if (reviewDecisionThumbUp instanceof HTMLButtonElement) {
    reviewDecisionThumbUp.classList.toggle('thumb-btn--selected', upSelected);
    reviewDecisionThumbUp.setAttribute('aria-pressed', upSelected ? 'true' : 'false');
  }
  if (reviewDecisionThumbDown instanceof HTMLButtonElement) {
    reviewDecisionThumbDown.classList.toggle('thumb-btn--selected', downSelected);
    reviewDecisionThumbDown.setAttribute('aria-pressed', downSelected ? 'true' : 'false');
  }
}

/**
 * @param {1 | -1 | null} rating
 */
function setReviewDecisionRating(rating) {
  reviewDecisionRating = rating;
  syncReviewDecisionThumbButtons();
}

function setReviewDecisionError(msg) {
  if (!reviewDecisionError) return;
  if (!msg) {
    reviewDecisionError.classList.add('hidden');
    reviewDecisionError.textContent = '';
    return;
  }
  reviewDecisionError.textContent = msg;
  reviewDecisionError.classList.remove('hidden');
}

function setReviewDecisionPreflight(msg) {
  if (!reviewDecisionPreflight) return;
  if (!msg) {
    reviewDecisionPreflight.classList.add('hidden');
    reviewDecisionPreflight.textContent = '';
    return;
  }
  reviewDecisionPreflight.textContent = msg;
  reviewDecisionPreflight.classList.remove('hidden');
}

function updateReviewDecisionCharCount() {
  if (!reviewDecisionCharCount || !reviewDecisionInput) return;
  const n = reviewDecisionInput.value.length;
  reviewDecisionCharCount.textContent = `${n} / 1000`;
}

function showReviewDecisionModal(show) {
  if (!reviewDecisionModal) return;
  reviewDecisionModal.classList.toggle('hidden', !show);
  syncMainPanelBlocked();
  if (show) {
    setReviewDecisionError('');
    updateReviewDecisionCharCount();
    reviewDecisionInput?.focus();
  }
}

function closeReviewDecisionModal() {
  reviewDecisionSubmitBlocked = false;
  setReviewDecisionRating(null);
  setReviewDecisionPreflight('');
  setReviewDecisionError('');
  if (reviewDecisionSend instanceof HTMLButtonElement) {
    reviewDecisionSend.disabled = false;
    reviewDecisionSend.textContent = 'Send it';
  }
  showReviewDecisionModal(false);
}

async function openReviewDecisionModal() {
  const moderationId = lastReportContext.moderationHistoryId;
  const apiOrigin = lastReportContext.apiOrigin;
  if (!moderationId || !apiOrigin) {
    setStatus('No saved report id for feedback.', true);
    return;
  }

  reviewDecisionSubmitBlocked = false;
  setReviewDecisionRating(null);
  setReviewDecisionPreflight('Checking prior feedback…');
  setReviewDecisionError('');
  if (reviewDecisionInput) reviewDecisionInput.value = '';
  showReviewDecisionModal(true);

  try {
    const settings = await loadSettings();
    const permitted = await ensureHostPermission(apiOrigin);
    if (!permitted) {
      const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
      closeReviewDecisionModal();
      setStatus(
        `Host permission required for ${formatApiProfileUiLabel(api)}. Allow access in Options.`,
        true,
      );
      return;
    }

    const status = await fetchFeedbackExists(apiOrigin, moderationId);
    if (status.exists && !status.canSubmitAgain) {
      reviewDecisionSubmitBlocked = true;
      setReviewDecisionPreflight(
        'You already submitted feedback for this report. Open the full report and use Discuss to unlock another submission.',
      );
      if (reviewDecisionSend instanceof HTMLButtonElement) reviewDecisionSend.disabled = true;
    } else if (status.exists && status.canSubmitAgain) {
      setReviewDecisionPreflight('You submitted feedback before; you can send an updated note.');
    } else {
      setReviewDecisionPreflight('');
    }
  } catch (err) {
    setReviewDecisionPreflight('');
    setReviewDecisionError(err instanceof Error ? err.message : String(err));
  }
}

async function sendReviewDecisionFromModal() {
  if (reviewDecisionSubmitBlocked) return;

  const moderationId = lastReportContext.moderationHistoryId;
  const apiOrigin = lastReportContext.apiOrigin;
  if (!moderationId || !apiOrigin) {
    setReviewDecisionError('No saved report id for feedback.');
    return;
  }

  if (reviewDecisionRating !== 1 && reviewDecisionRating !== -1) {
    setReviewDecisionError('Choose thumbs up or thumbs down.');
    return;
  }

  const comment = reviewDecisionInput?.value.trim() ?? '';
  if (!comment) {
    setReviewDecisionError('Leave a message before sending.');
    return;
  }
  if (comment.length > 1000) {
    setReviewDecisionError('Feedback must be 1000 characters or fewer.');
    return;
  }

  const settings = await loadSettings();
  const permitted = await ensureHostPermission(apiOrigin);
  if (!permitted) {
    const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
    setReviewDecisionError(
      `Host permission required for ${formatApiProfileUiLabel(api)}. Grant access in Options.`,
    );
    return;
  }

  if (reviewDecisionSend instanceof HTMLButtonElement) {
    reviewDecisionSend.disabled = true;
    reviewDecisionSend.textContent = 'Sending…';
  }
  setReviewDecisionError('');

  try {
    const feedbackSessionId = await getOrCreateFeedbackSessionId();
    const appVersion = getExtensionVersion();
    const reporterEmail = normalizeReportEmail(settings.reportShareRecipientEmail);
    const reporterForApi =
      reporterEmail && isValidReportEmail(reporterEmail) ? reporterEmail : null;
    await postSubmitFeedback(apiOrigin, {
      moderationId,
      comment,
      feedbackSessionId,
      rating: reviewDecisionRating,
      provider: lastReportContext.provider,
      analysisType: lastReportContext.analysisType,
      appVersion,
      reporterEmail: reporterForApi,
    });
    closeReviewDecisionModal();
    setStatus(
      reporterForApi
        ? `Feedback saved. Your comment will be emailed to ${reporterForApi} shortly (delivery is async).`
        : 'Feedback saved on the report. Add a report email in Options to receive your comment by email.',
    );
  } catch (err) {
    setReviewDecisionError(err instanceof Error ? err.message : String(err));
    if (reviewDecisionSend instanceof HTMLButtonElement) {
      reviewDecisionSend.disabled = false;
      reviewDecisionSend.textContent = 'Send it';
    }
  }
}

async function handleOpenReportClick() {
  const viewUrl = resolveReportViewUrl({
    apiOrigin: lastReportContext.apiOrigin,
    moderationHistoryId: lastReportContext.moderationHistoryId,
    moderationReportUrl: lastReportContext.moderationReportUrl,
  });
  if (!viewUrl) {
    setStatus('No full report URL for this result.', true);
    return;
  }
  await chrome.tabs.create({ url: viewUrl });
}

/**
 * @param {EventTarget | null} button
 * @param {string} email
 */
async function sendEmailReportFlow(button, email) {
  const settings = await loadSettings();
  const moderationId = lastReportContext.moderationHistoryId;
  const apiOrigin = lastReportContext.apiOrigin;
  if (!moderationId || !apiOrigin) {
    setStatus('No saved report id for email.', true);
    return;
  }
  const permitted = await ensureHostPermission(apiOrigin);
  if (!permitted) {
    const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
    setStatus(
      `Host permission required for ${formatApiProfileUiLabel(api)}. Allow access in Options.`,
      true,
    );
    return;
  }
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
    const prev = button.textContent;
    button.textContent = 'Sending…';
    try {
      setStatus(`Sending report to ${email}…`);
      const sendResult = await postShareReportEmail(apiOrigin, { moderationId, email });
      setShareReportEmailStatus(sendResult);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err), true);
    } finally {
      button.disabled = false;
      button.textContent = prev;
    }
    return;
  }
  try {
    setStatus(`Sending report to ${email}…`);
    const sendResult = await postShareReportEmail(apiOrigin, { moderationId, email });
    setShareReportEmailStatus(sendResult);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
  }
}

async function openEmailReportDialog(button) {
  const settings = await loadSettings();
  const saved = normalizeReportEmail(settings.reportShareRecipientEmail);
  const hasSavedEmail = !!(saved && isValidReportEmail(saved));
  pendingEmailReportButton = button instanceof HTMLButtonElement ? button : null;
  applyReportEmailModalMode('sendReport', { hasSavedEmail });
  reportEmailInput.value = settings.reportShareRecipientEmail || '';
  showReportEmailModal(true);
}

async function handleEmailReportClick(button) {
  const moderationId = lastReportContext.moderationHistoryId;
  const apiOrigin = lastReportContext.apiOrigin;
  if (!moderationId || !apiOrigin) {
    setStatus('No saved report id for email.', true);
    return;
  }
  await openEmailReportDialog(button);
}

/**
 * @param {{ emailSent: boolean; emailedTo: string | null; requestedEmail: string }} sendResult
 */
function setShareReportEmailStatus(sendResult) {
  const requested = sendResult.requestedEmail.trim().toLowerCase();
  const delivered = (sendResult.emailedTo || sendResult.requestedEmail).trim().toLowerCase();
  if (!sendResult.emailSent) {
    setStatus('Report saved but email was not sent (check server Resend config).', true);
    return;
  }
  if (delivered && requested && delivered !== requested) {
    setStatus(
      `Report delivered to ${sendResult.emailedTo} (not ${sendResult.requestedEmail}). Production may use RESEND_REPORT_TO redirect.`,
      true,
    );
    return;
  }
  setStatus(`Report emailed to ${sendResult.emailedTo || sendResult.requestedEmail}.`);
}

resultsEl.addEventListener('click', (e) => {
  const target = /** @type {HTMLElement} */ (e.target);
  const openBtn = target?.closest?.('.open-report-btn');
  if (openBtn && resultsEl.contains(openBtn)) {
    handleOpenReportClick().catch((err) => {
      setStatus(err instanceof Error ? err.message : String(err), true);
    });
    return;
  }
  const emailBtn = target?.closest?.('.email-report-btn');
  if (emailBtn && resultsEl.contains(emailBtn)) {
    handleEmailReportClick(emailBtn).catch((err) => {
      setStatus(err instanceof Error ? err.message : String(err), true);
    });
    return;
  }
  const reviewBtn = target?.closest?.('.review-decision-btn');
  if (reviewBtn && resultsEl.contains(reviewBtn)) {
    openReviewDecisionModal().catch((err) => {
      setStatus(err instanceof Error ? err.message : String(err), true);
    });
    return;
  }
  const btn = target?.closest?.('.copy-btn');
  if (!btn || !resultsEl.contains(btn)) return;
  const forId = btn.getAttribute('data-for');
  if (!forId) return;
  copyElementTextToClipboard(forId, btn).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

/**
 * @param {Record<string, unknown>} result
 * @param {string | null | undefined} apiOrigin
 * @param {{ reportEmailEnabled: boolean; reportOpenTabEnabled: boolean }} flags
 */
function renderResults(result, apiOrigin, flags) {
  rememberReportContext(result, apiOrigin);
  const decision = String(result.decision || 'Unknown');
  const reasonPlain = sanitizeModerationReason(String(result.reason || ''));
  const breakdownPlain = String(result.decisionBreakdown || '');
  const category = formatReportCategory(result.reportCategory);
  const revision = escapeHtml(String(result.suggestedRevision || ''));
  const mode = escapeHtml(String(result.moderationMode || ''));
  const contract = escapeHtml(String(result.promptContractId || result.provider?.promptContractId || ''));
  const timings = result.ragTimings;
  let timingLine = '';
  if (timings && typeof timings === 'object') {
    const t = /** @type {{ totalMs?: number; llmMs?: number }} */ (timings);
    timingLine = `<p class="muted">Timings: total ${t.totalMs ?? '—'} ms, LLM ${t.llmMs ?? '—'} ms</p>`;
  }

  const reportActions = buildReportActionsHtml(result, apiOrigin ?? null, flags);
  const geminiHint =
    isModerationFailureResult(result) && isGeminiQuotaOrBillingIssue(reasonPlain)
      ? geminiQuotaResultsHintHtml()
      : '';

  resultsEl.innerHTML = `
    ${reportActions}
    ${decisionResultBlock(decision)}
    ${geminiHint}
    ${copyBlockSection('Reason', 'result-reason', reasonPlain)}
    ${breakdownPlain.trim() ? copyBlockSection('Breakdown', 'result-breakdown', breakdownPlain) : ''}
    ${category ? `<p><strong>Report category:</strong> ${escapeHtml(category)}</p>` : ''}
    ${revision && revision !== 'N/A' ? `<p><strong>Suggested revision:</strong> ${revision}</p>` : ''}
    ${mode ? `<p class="muted">Mode: ${mode}${contract ? ` · ${contract}` : ''}</p>` : ''}
    ${timingLine}
    ${renderContextImpactHtml(result.contextImpact)}
    ${renderRagSourcesFoldHtml(result.ragSources)}
  `;
  resultsEl.classList.remove('hidden');
}

moderateBtn.addEventListener('click', async () => {
  const content = contentInput.value.trim();
  if (!content) {
    setStatus('Enter content to moderate.', true);
    return;
  }

  const postContext = postContextInput.value.trim();
  const analysisType = analysisSelect.value;
  const badWordsEnabled = badWordsCheckbox.checked;
  const requestKey = moderationRequestKey(
    content,
    postContext,
    analysisType,
    badWordsEnabled,
  );
  if (requestKey === lastSuccessfulModerationKey) {
    setStatus(
      'Already moderated this same text with these settings. Your last decision is in the Results section below—edit content, change analysis, or Clear content to run again.',
      true,
    );
    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }

  setStatus('');
  resultsEl.classList.add('hidden');

  const settings = await loadSettings();
  const byokActiveForRequest = isByokConfigured(settings);
  if (shouldClearByokWithoutKey(settings)) {
    await saveSettingsPatch({ geminiByokEnabled: false });
  }
  if (!isFeedLocationConfirmed(settings)) {
    setPickerValues(settings.userLocation);
    showLocationModal(true);
    showReportEmailModal(false);
    setStatus('Confirm your feed location first.', true);
    return;
  }

  const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
  if (!api.apiOrigin) {
    setStatus('Invalid API origin. Set Options → environment profile.', true);
    return;
  }
  const permitted = await ensureHostPermission(api.apiOrigin);
  if (!permitted) {
    setStatus(
      `Host permission denied for ${formatApiProfileUiLabel(api)}. Allow access in the prompt or Options.`,
      true,
    );
    return;
  }

  const timeoutSec = settings.moderateTimeoutSec;
  const requestId = crypto.randomUUID();
  activeModerationRequestId = requestId;
  startModerationProgress(timeoutSec);
  setStatus('Moderating…');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MODERATE',
      requestId,
      payload: {
        content,
        postContext,
        analysisType,
        badWordsEnabled,
      },
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Unknown error');
    }

    const reportFlags = {
      reportEmailEnabled: settings.reportEmailEnabled,
      reportOpenTabEnabled: settings.reportOpenTabEnabled,
    };
    renderResults(response.result, response.meta?.apiOrigin, reportFlags);
    if (!isModerationFailureResult(response.result)) {
      lastSuccessfulModerationKey = requestKey;
    }
    if (isModerationFailureResult(response.result)) {
      const reason = sanitizeModerationReason(String(response.result?.reason || ''));
      if (byokActiveForRequest && isLikelyGeminiKeyAuthFailure(reason)) {
        await saveSettingsPatch({ geminiByokEnabled: false });
        await refreshByokBadge(await loadSettings());
        setStatus(switchedToSharedPoolStatusMessage(), true);
      } else if (isGeminiQuotaOrBillingIssue(reason)) {
        setGeminiQuotaHelpStatus(byokActiveForRequest);
      } else {
        setStatus(moderationFailureStatusMessage(response.result), true);
      }
    } else {
      const savedReport = hasSavedReportForActions(response.result);
      const actionsHtml = buildReportActionsHtml(
        /** @type {Record<string, unknown>} */ (response.result),
        response.meta?.apiOrigin ?? null,
        reportFlags,
      );
      if (settings.reportEmailEnabled && !actionsHtml) {
        setStatus(
          savedReport
            ? 'Done. Report actions unavailable for this result.'
            : 'Done. No saved full report from API (use Production with DB save, or check AUTO_SAVE_TO_DB).',
          !savedReport,
        );
      } else if (actionsHtml.includes('review-decision-btn')) {
        setStatus(
          `Done. Report actions are above the decision (${REVIEW_THIS_REPORT_LABEL}, email, or open full report).`,
        );
      } else if (actionsHtml.includes('open-report-btn')) {
        setStatus('Done. Click Open full report above the decision.');
      } else {
        setStatus('Done.');
      }
    }
    if (response.meta?.profileLabel) {
      connectionBadge.textContent = response.meta.profileLabel;
    }
  } catch (err) {
    setErrorStatus(err instanceof Error ? err.message : String(err));
  } finally {
    stopModerationProgress();
  }
});

abortModerateBtn.addEventListener('click', () => {
  if (!activeModerationRequestId) return;
  chrome.runtime.sendMessage({
    type: 'MODERATE_ABORT',
    requestId: activeModerationRequestId,
  });
  setStatus('Stopping…');
});

clearBtn.addEventListener('click', () => {
  contentInput.value = '';
  postContextInput.value = '';
  lastSuccessfulModerationKey = null;
  resultsEl.classList.add('hidden');
  stopModerateBtnPrompt();
  setStatus('');
});

/** @typedef {'content' | 'postContext'} CaptureField */

/**
 * @param {CaptureField} field
 * @returns {HTMLTextAreaElement}
 */
function textareaForField(field) {
  return field === 'postContext' ? postContextInput : contentInput;
}

/**
 * @param {CaptureField} field
 */
function clearCaptureField(field) {
  const el = textareaForField(field);
  el.value = '';
  if (field === 'content') {
    lastSuccessfulModerationKey = null;
    resultsEl.classList.add('hidden');
    stopModerateBtnPrompt();
  }
}

/**
 * @param {string} text
 * @param {CaptureField} field
 */
function applyCapturedText(text, field) {
  const el = textareaForField(field);
  el.value = text;
  el.focus();
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  el.setSelectionRange(0, el.value.length);
  setStatus('');
}

/**
 * Replace field with pick result only (no merge with prior draft).
 * @param {string} text
 * @param {CaptureField} field
 */
function applyPickedText(text, field) {
  clearCaptureField(field);
  applyCapturedText(text, field);
}

/**
 * @param {import('../lib/pendingModerationDraft.js').PendingModerationDraft} draft
 */
function applyPendingDraft(draft) {
  if (draft.content) {
    applyCapturedText(draft.content, draft.field === 'postContext' ? 'postContext' : 'content');
  }
  if (draft.postContext) {
    if (postContextDetails instanceof HTMLDetailsElement) postContextDetails.open = true;
    applyCapturedText(draft.postContext, 'postContext');
  }
}

async function consumePendingDraftOnLoad() {
  const draft = await consumePendingModerationDraft();
  if (draft) applyPendingDraft(draft);
}

/** @type {boolean} */
let pickModeInProgress = false;
/** Bumped when pick is aborted so in-flight START_PICK_MODE responses are ignored. */
let pickRunGeneration = 0;
/** @type {number | null} */
let activePickTabId = null;
/** @type {((e: KeyboardEvent) => void) | null} */
let pickEscapeKeyHandler = null;

function attachPickEscapeListener(tabId) {
  detachPickEscapeListener();
  activePickTabId = tabId;
  pickEscapeKeyHandler = (e) => {
    if (e.key !== 'Escape' || !pickModeInProgress || activePickTabId == null) return;
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({ type: 'CANCEL_PICK_MODE', tabId: activePickTabId }).catch(() => {});
  };
  document.addEventListener('keydown', pickEscapeKeyHandler, true);
}

function detachPickEscapeListener() {
  if (pickEscapeKeyHandler) {
    document.removeEventListener('keydown', pickEscapeKeyHandler, true);
    pickEscapeKeyHandler = null;
  }
  activePickTabId = null;
}

function endPickModeUi() {
  pickModeInProgress = false;
  detachPickEscapeListener();
  syncPickContentButton();
}

/** Cancel in-page pick and reset side panel button (e.g. factory reset while pick was active). */
function abortPickMode() {
  pickRunGeneration += 1;
  const tabId = activePickTabId;
  endPickModeUi();
  if (tabId != null) {
    chrome.runtime.sendMessage({ type: 'CANCEL_PICK_MODE', tabId }).catch(() => {});
  }
}

function syncPickContentButton() {
  if (!(pickContentBtn instanceof HTMLButtonElement)) return;
  const pickActive = pickModeInProgress;
  const moderating = activeModerationRequestId != null;
  pickContentBtn.disabled = pickActive || moderating;
  pickContentBtn.classList.toggle('pick-btn-active', pickActive);
  pickContentBtn.classList.toggle('pick-btn-muted', moderating && !pickActive);
  pickContentBtn.setAttribute('aria-busy', pickActive ? 'true' : 'false');
  pickContentBtn.textContent = pickActive ? 'Click text on the page…' : 'Click on Text to Moderate';
}

/**
 * @param {CaptureField} field
 */
async function runPickModeForField(field) {
  const settings = await loadSettings();
  if (!isFeedLocationConfirmed(settings)) {
    setStatus('Confirm feed location in the dialog first.', true);
    return;
  }
  if (activeModerationRequestId) {
    setStatus('Wait for moderation to finish.', true);
    return;
  }
  if (pickModeInProgress) {
    setStatus('Already waiting for a click on the page. Click text there or press Esc.', true);
    return;
  }
  const runId = ++pickRunGeneration;
  pickModeInProgress = true;
  syncPickContentButton();
  setStatus('On the page: click on the text you want to capture. Esc cancels (here or on the page).');
  let tabId;
  try {
    tabId = await prepareTabCaptureFromSidePanel();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
    endPickModeUi();
    return;
  }
  clearCaptureField(field);
  attachPickEscapeListener(tabId);
  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: 'START_PICK_MODE', tabId });
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
    endPickModeUi();
    return;
  }
  endPickModeUi();
  if (runId !== pickRunGeneration) return;
  if (!response?.ok) {
    const msg = response?.error || 'Could not capture text.';
    if (msg.includes('cancelled')) {
      setStatus('Cancelled.');
      return;
    }
    setStatus(msg, true);
    return;
  }
  if (!response.text) {
    setStatus('Nothing captured.', true);
    return;
  }
  applyPickedText(response.text, field);
  if (field === 'content') updateModerateBtnPrompt();
}

function applyContentFromClipboard(text) {
  if (!text.trim()) {
    setStatus('Clipboard is empty.', true);
    return;
  }
  applyCapturedText(text, 'content');
  updateModerateBtnPrompt();
}

contentInput.addEventListener('paste', () => {
  requestAnimationFrame(() => updateModerateBtnPrompt());
});

contentInput.addEventListener('input', () => updateModerateBtnPrompt());

analysisSelect.addEventListener('change', () => updateModerateBtnPrompt());
badWordsCheckbox.addEventListener('change', () => updateModerateBtnPrompt());
postContextInput.addEventListener('input', () => updateModerateBtnPrompt());

/** Call readText in the same turn as the click — async/await can drop user activation. */
function pasteFromClipboard() {
  setStatus('');
  navigator.clipboard
    .readText()
    .then(applyContentFromClipboard)
    .catch(() => {
      contentInput.focus();
      const inserted = document.execCommand('paste');
      if (!inserted) {
        setStatus('Paste blocked. Reload the extension, then try again or use Ctrl+V in the box.', true);
      }
    });
}

pasteContentBtn.addEventListener('click', () => {
  pasteFromClipboard();
});

pickContentBtn.addEventListener('click', () => {
  runPickModeForField('content').catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
    endPickModeUi();
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'session') {
    const draftChange = changes[PENDING_DRAFT_SESSION_KEY];
    if (draftChange?.newValue) {
      applyPendingDraft(
        /** @type {import('../lib/pendingModerationDraft.js').PendingModerationDraft} */ (
          draftChange.newValue
        ),
      );
      consumePendingModerationDraft().catch(() => {});
    }
    return;
  }
  if (area !== 'local') return;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === BYOK_CONTINUE_SHARED_POOL) {
    setInfoStatus(sharedPoolActiveStatusMessage());
    refreshByokBadge(loadSettings()).catch(() => {});
    return false;
  }
  if (message?.type === EXTENSION_UI_SYNC) {
    syncSidePanelFromStorage().catch(() => {});
  }
  return false;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    syncSidePanelFromStorage().catch(() => {});
  }
});

for (const optionsToggleBtn of document.querySelectorAll('.options-toggle-btn')) {
  optionsToggleBtn.addEventListener('click', () => {
    toggleOptionsPage().catch((err) => {
      setStatus(err instanceof Error ? err.message : String(err), true);
    });
  });
}

byokBadge?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  handleByokBadgeClick().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

refreshConnectionBadge()
  .then(() => refreshSharedPoolStatusHint())
  .catch(() => {});
consumePendingDraftOnLoad().catch(() => {});
initLocationUi().catch((err) => {
  setStatus(err instanceof Error ? err.message : String(err), true);
});
