import {
  loadSettings,
  saveUserLocation,
  hasValidUserLocation,
  isFeedLocationConfirmed,
} from '../lib/userSettings.js';
import {
  DEFAULT_USER_LOCATION,
  canonicalUsState,
  resolveStoredUserLocation,
} from '../lib/usStates.js';
import { createStatePicker } from '../lib/statePicker.js';
import { resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import { toggleOptionsPage } from '../lib/optionsPage.js';
import {
  PENDING_DRAFT_SESSION_KEY,
  consumePendingModerationDraft,
} from '../lib/pendingModerationDraft.js';
import { prepareTabCaptureFromSidePanel } from '../lib/prepareTabCapture.js';
import {
  decisionClass,
  formatReportCategory,
  renderRagSourcesHtml,
  renderContextImpactHtml,
  escapeHtml,
} from '../lib/formatters.js';

const modal = document.getElementById('location-modal');
const modalError = document.getElementById('modal-error');
const modalSave = document.getElementById('modal-save');
const mainPanel = document.getElementById('main-panel');
const connectionBadge = document.getElementById('connection-badge');
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
const clearBtn = document.getElementById('clear-btn');
const optionsBtn = document.getElementById('options-btn');
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

function setPickerValues(value) {
  const resolved = resolveStoredUserLocation(value);
  modalLocationPicker.setValue(resolved);
  locationPicker.setValue(resolved);
}

function statePickerBusy() {
  return modalLocationPicker.isListOpen() || locationPicker.isListOpen();
}

function showModal(show) {
  modal.classList.toggle('hidden', !show);
  if (show) {
    mainPanel.classList.add('blocked');
    mainPanel.setAttribute('aria-hidden', 'true');
    modalLocationPicker.focus();
  } else {
    mainPanel.classList.remove('blocked');
    mainPanel.setAttribute('aria-hidden', 'false');
  }
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
  if (api.apiOrigin) {
    connectionBadge.textContent = `${api.label} · ${api.apiOrigin}`;
  } else {
    connectionBadge.textContent = `${api.label} · (set custom URL in Options)`;
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
    showModal(true);
    return;
  }

  setPickerValues(refreshed.userLocation);
  showModal(false);
}

modalSave.addEventListener('click', async () => {
  setModalError('');
  modalLocationPicker.closeList();
  const selected = modalLocationPicker.getValue();
  try {
    await saveUserLocation(selected, { onboarding: true });
    locationPicker.setValue(selected);
    showModal(false);
  } catch (err) {
    setModalError(err instanceof Error ? err.message : String(err));
  }
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
  if (changes.envProfileId || changes.customApiOrigin) {
    refreshConnectionBadge().catch(() => {});
  }
  if (changes.userLocation || changes.locationOnboardingComplete) {
    loadSettings().then((s) => {
      if (!isFeedLocationConfirmed(s)) {
        if (!statePickerBusy()) setPickerValues(s.userLocation);
        showModal(true);
      }
    }).catch(() => {});
  }
});

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', isError);
}

/**
 * @param {number} timeoutSec
 */
function startModerationProgress(timeoutSec) {
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
}

/**
 * @param {string} label
 * @param {string} bodyId
 * @param {string} plainText
 */
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

resultsEl.addEventListener('click', (e) => {
  const btn = /** @type {HTMLElement} */ (e.target)?.closest?.('.copy-btn');
  if (!btn || !resultsEl.contains(btn)) return;
  const forId = btn.getAttribute('data-for');
  if (!forId) return;
  copyElementTextToClipboard(forId, btn).catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

function renderResults(result) {
  const decision = String(result.decision || 'Unknown');
  const reasonPlain = String(result.reason || '');
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

  resultsEl.innerHTML = `
    <p class="decision ${decisionClass(decision)}">${escapeHtml(decision)}</p>
    ${copyBlockSection('Reason', 'result-reason', reasonPlain)}
    ${breakdownPlain.trim() ? copyBlockSection('Breakdown', 'result-breakdown', breakdownPlain) : ''}
    ${category ? `<p><strong>Report category:</strong> ${escapeHtml(category)}</p>` : ''}
    ${revision && revision !== 'N/A' ? `<p><strong>Suggested revision:</strong> ${revision}</p>` : ''}
    ${mode ? `<p class="muted">Mode: ${mode}${contract ? ` · ${contract}` : ''}</p>` : ''}
    ${timingLine}
    ${renderContextImpactHtml(result.contextImpact)}
    <h3>Retrieved guidelines</h3>
    <ul>${renderRagSourcesHtml(result.ragSources)}</ul>
  `;
  resultsEl.classList.remove('hidden');
}

moderateBtn.addEventListener('click', async () => {
  setStatus('');
  resultsEl.classList.add('hidden');
  const content = contentInput.value.trim();
  if (!content) {
    setStatus('Enter content to moderate.', true);
    return;
  }

  const settings = await loadSettings();
  if (!isFeedLocationConfirmed(settings)) {
    setPickerValues(settings.userLocation);
    showModal(true);
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
    setStatus(`Host permission denied for ${api.apiOrigin}. Allow access in the prompt or Options.`, true);
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
        postContext: postContextInput.value,
        analysisType: analysisSelect.value,
        badWordsEnabled: badWordsCheckbox.checked,
      },
    });

    if (!response?.ok) {
      throw new Error(response?.error || 'Unknown error');
    }

    renderResults(response.result);
    setStatus('Done.');
    if (response.meta?.apiOrigin) {
      connectionBadge.textContent = `${response.meta.profileLabel} · ${response.meta.apiOrigin}`;
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
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
  resultsEl.classList.add('hidden');
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
    resultsEl.classList.add('hidden');
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
  setPickButtonActive(false);
}

/**
 * @param {boolean} active
 */
function setPickButtonActive(active) {
  if (!(pickContentBtn instanceof HTMLButtonElement)) return;
  pickContentBtn.disabled = active;
  pickContentBtn.classList.toggle('pick-btn-active', active);
  pickContentBtn.setAttribute('aria-busy', active ? 'true' : 'false');
  pickContentBtn.textContent = active ? 'Click text on the page…' : 'Click on Text to Moderate';
}

/**
 * @param {CaptureField} field
 */
async function runPickModeForField(field) {
  if (pickModeInProgress) {
    setStatus('Already waiting for a click on the page. Click text there or press Esc.', true);
    return;
  }
  pickModeInProgress = true;
  setPickButtonActive(true);
  clearCaptureField(field);
  setStatus('On the page: drag to select text, or click one line. Esc cancels (here or on the page).');
  let tabId;
  try {
    tabId = await prepareTabCaptureFromSidePanel();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), true);
    endPickModeUi();
    return;
  }
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
}

function applyContentFromClipboard(text) {
  if (!text.trim()) {
    setStatus('Clipboard is empty.', true);
    return;
  }
  applyCapturedText(text, 'content');
}

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
  if (area !== 'session') return;
  const draftChange = changes[PENDING_DRAFT_SESSION_KEY];
  if (!draftChange?.newValue) return;
  applyPendingDraft(/** @type {import('../lib/pendingModerationDraft.js').PendingModerationDraft} */ (draftChange.newValue));
  consumePendingModerationDraft().catch(() => {});
});

optionsBtn.addEventListener('click', () => {
  toggleOptionsPage().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

refreshConnectionBadge().catch(() => {});
consumePendingDraftOnLoad().catch(() => {});
initLocationUi().catch((err) => {
  setStatus(err instanceof Error ? err.message : String(err), true);
});
