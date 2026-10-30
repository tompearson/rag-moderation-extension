import {
  loadSettings,
  saveUserLocation,
  hasValidUserLocation,
  DEFAULT_USER_LOCATION,
} from '../lib/userSettings.js';
import { resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import {
  decisionClass,
  formatReportCategory,
  renderRagSourcesHtml,
  renderContextImpactHtml,
  escapeHtml,
} from '../lib/formatters.js';

const modal = document.getElementById('location-modal');
const modalInput = /** @type {HTMLInputElement} */ (document.getElementById('modal-location'));
const modalError = document.getElementById('modal-error');
const modalSave = document.getElementById('modal-save');
const mainPanel = document.getElementById('main-panel');
const connectionBadge = document.getElementById('connection-badge');
const locationInput = /** @type {HTMLInputElement} */ (document.getElementById('user-location'));
const contentInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('content'));
const postContextInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('post-context'));
const analysisSelect = /** @type {HTMLSelectElement} */ (document.getElementById('analysis-type'));
const badWordsCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('bad-words-enabled'));
const moderateBtn = document.getElementById('moderate-btn');
const clearBtn = document.getElementById('clear-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

/** @type {ReturnType<typeof setTimeout> | null} */
let locationDebounce = null;

function showModal(show) {
  modal.classList.toggle('hidden', !show);
  if (show) {
    mainPanel.classList.add('blocked');
    mainPanel.setAttribute('aria-hidden', 'true');
    modalInput.focus();
    modalInput.select();
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

async function initLocationUi() {
  const settings = await loadSettings();
  if (!hasValidUserLocation(settings.userLocation)) {
    modalInput.value = DEFAULT_USER_LOCATION;
    showModal(true);
    return;
  }
  locationInput.value = settings.userLocation;
  showModal(false);
}

async function persistInlineLocation() {
  const trimmed = locationInput.value.trim();
  if (!trimmed) return;
  const settings = await loadSettings();
  if (settings.userLocation === trimmed) return;
  await saveUserLocation(trimmed, { onboarding: settings.locationOnboardingComplete });
}

modalSave.addEventListener('click', async () => {
  setModalError('');
  const trimmed = modalInput.value.trim();
  if (!trimmed) {
    setModalError('Enter a state or region.');
    return;
  }
  try {
    await saveUserLocation(trimmed, { onboarding: true });
    locationInput.value = trimmed;
    showModal(false);
  } catch (err) {
    setModalError(err instanceof Error ? err.message : String(err));
  }
});

modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    modalSave.click();
  }
});

locationInput.addEventListener('input', () => {
  if (locationDebounce) clearTimeout(locationDebounce);
  locationDebounce = setTimeout(() => {
    persistInlineLocation().catch(() => {});
  }, 400);
});

locationInput.addEventListener('blur', () => {
  persistInlineLocation().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.userLocation && !locationInput.matches(':focus')) {
    const next = changes.userLocation.newValue;
    if (hasValidUserLocation(next)) locationInput.value = next;
  }
  if (changes.envProfileId || changes.customApiOrigin) {
    refreshConnectionBadge().catch(() => {});
  }
  if (changes.userLocation && !hasValidUserLocation(changes.userLocation.newValue)) {
    modalInput.value = DEFAULT_USER_LOCATION;
    showModal(true);
  }
});

function setStatus(msg, isError = false) {
  statusEl.textContent = msg || '';
  statusEl.classList.toggle('error', isError);
}

function renderResults(result) {
  const decision = String(result.decision || 'Unknown');
  const reason = escapeHtml(String(result.reason || ''));
  const breakdown = escapeHtml(String(result.decisionBreakdown || ''));
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
    <p><strong>Reason:</strong> ${reason}</p>
    ${breakdown ? `<h3>Breakdown</h3><p>${breakdown}</p>` : ''}
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
  if (!hasValidUserLocation(settings.userLocation)) {
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

  moderateBtn.disabled = true;
  setStatus('Moderating… (up to 120s on cold start)');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MODERATE',
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
    moderateBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', () => {
  contentInput.value = '';
  postContextInput.value = '';
  resultsEl.classList.add('hidden');
  setStatus('');
});

refreshConnectionBadge().catch(() => {});
initLocationUi().catch((err) => {
  setStatus(err instanceof Error ? err.message : String(err), true);
});
