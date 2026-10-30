import {
  loadSettings,
  saveUserLocation,
  hasValidUserLocation,
} from '../lib/userSettings.js';
import {
  DEFAULT_USER_LOCATION,
  canonicalUsState,
  resolveStoredUserLocation,
  populateStateSelect,
} from '../lib/usStates.js';
import { resolveApiConfig } from '../lib/envProfiles.js';
import { ensureHostPermission } from '../lib/permissions.js';
import { toggleOptionsPage } from '../lib/optionsPage.js';
import {
  decisionClass,
  formatReportCategory,
  renderRagSourcesHtml,
  renderContextImpactHtml,
  escapeHtml,
} from '../lib/formatters.js';

const modal = document.getElementById('location-modal');
const modalSelect = /** @type {HTMLSelectElement} */ (document.getElementById('modal-location'));
const modalError = document.getElementById('modal-error');
const modalSave = document.getElementById('modal-save');
const mainPanel = document.getElementById('main-panel');
const connectionBadge = document.getElementById('connection-badge');
const locationSelect = /** @type {HTMLSelectElement} */ (document.getElementById('user-location'));
const contentInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('content'));
const postContextInput = /** @type {HTMLTextAreaElement} */ (document.getElementById('post-context'));
const analysisSelect = /** @type {HTMLSelectElement} */ (document.getElementById('analysis-type'));
const badWordsCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('bad-words-enabled'));
const moderateBtn = document.getElementById('moderate-btn');
const clearBtn = document.getElementById('clear-btn');
const optionsBtn = document.getElementById('options-btn');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');

populateStateSelect(modalSelect, DEFAULT_USER_LOCATION);
populateStateSelect(locationSelect, DEFAULT_USER_LOCATION);

function setSelectValue(selectEl, value) {
  populateStateSelect(selectEl, value);
}

function showModal(show) {
  modal.classList.toggle('hidden', !show);
  if (show) {
    mainPanel.classList.add('blocked');
    mainPanel.setAttribute('aria-hidden', 'true');
    modalSelect.focus();
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

  if (!hasValidUserLocation(refreshed.userLocation)) {
    setSelectValue(modalSelect, DEFAULT_USER_LOCATION);
    setSelectValue(locationSelect, DEFAULT_USER_LOCATION);
    showModal(true);
    return;
  }

  setSelectValue(locationSelect, refreshed.userLocation);
  setSelectValue(modalSelect, refreshed.userLocation);
  showModal(false);
}

modalSave.addEventListener('click', async () => {
  setModalError('');
  const selected = modalSelect.value;
  try {
    await saveUserLocation(selected, { onboarding: true });
    setSelectValue(locationSelect, selected);
    showModal(false);
  } catch (err) {
    setModalError(err instanceof Error ? err.message : String(err));
  }
});

modalSelect.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    modalSave.click();
  }
});

locationSelect.addEventListener('change', async () => {
  const selected = locationSelect.value;
  const settings = await loadSettings();
  if (settings.userLocation === selected) return;
  try {
    await saveUserLocation(selected, { onboarding: settings.locationOnboardingComplete });
  } catch {
    setSelectValue(locationSelect, settings.userLocation);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.userLocation && document.activeElement !== locationSelect) {
    const next = changes.userLocation.newValue;
    if (hasValidUserLocation(next)) {
      setSelectValue(locationSelect, next);
      setSelectValue(modalSelect, next);
    }
  }
  if (changes.envProfileId || changes.customApiOrigin) {
    refreshConnectionBadge().catch(() => {});
  }
  if (changes.userLocation && !hasValidUserLocation(changes.userLocation.newValue)) {
    setSelectValue(modalSelect, DEFAULT_USER_LOCATION);
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
    setSelectValue(modalSelect, resolveStoredUserLocation(settings.userLocation));
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

optionsBtn.addEventListener('click', () => {
  toggleOptionsPage().catch((err) => {
    setStatus(err instanceof Error ? err.message : String(err), true);
  });
});

refreshConnectionBadge().catch(() => {});
initLocationUi().catch((err) => {
  setStatus(err instanceof Error ? err.message : String(err), true);
});
