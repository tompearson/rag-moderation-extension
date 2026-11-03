import { GEMINI_BYOK_OPTIONS_HASH, notifyFocusGeminiKeySetup } from './extensionUiSync.js';

const optionsPagePath = 'options/options.html';

function getOptionsPageUrl() {
  return chrome.runtime.getURL(optionsPagePath);
}

function getOptionsPageUrlWithGeminiKeyFocus() {
  return `${getOptionsPageUrl()}#${GEMINI_BYOK_OPTIONS_HASH}`;
}

/** @returns {Promise<chrome.tabs.Tab[]>} */
async function findOptionsTabs() {
  const exact = getOptionsPageUrl();
  const wildcard = exact.replace(/options\.html$/, 'options/*');
  const [byExact, byWildcard] = await Promise.all([
    chrome.tabs.query({ url: exact }),
    chrome.tabs.query({ url: wildcard }),
  ]);
  /** @type {Map<number, chrome.tabs.Tab>} */
  const byId = new Map();
  for (const tab of [...byExact, ...byWildcard]) {
    if (tab.id !== undefined) byId.set(tab.id, tab);
  }
  return [...byId.values()];
}

/** @returns {Promise<boolean>} True if an options tab was closed. */
export async function closeOptionsPageIfOpen() {
  const tabs = await findOptionsTabs();
  if (!tabs.length) return false;
  const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
  if (ids.length) await chrome.tabs.remove(ids);
  return true;
}

let toggleInFlight = false;

/**
 * Open Options or focus an existing tab — never closes.
 * @param {{ focusGeminiKey?: boolean }} [options]
 */
export async function openOptionsPage(options = {}) {
  const { focusGeminiKey = false } = options;
  const tabs = await findOptionsTabs();
  if (!tabs.length) {
    if (focusGeminiKey) {
      await chrome.tabs.create({ url: getOptionsPageUrlWithGeminiKeyFocus() });
    } else {
      await chrome.runtime.openOptionsPage();
    }
    return;
  }
  const tab = tabs.find((t) => t.id !== undefined);
  if (!tab?.id) return;
  await chrome.tabs.update(tab.id, { active: true });
  if (tab.windowId !== undefined) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
  if (focusGeminiKey) {
    const focusUrl = getOptionsPageUrlWithGeminiKeyFocus();
    if (tab.url && !tab.url.includes(`#${GEMINI_BYOK_OPTIONS_HASH}`)) {
      await chrome.tabs.update(tab.id, { url: focusUrl });
    } else {
      notifyFocusGeminiKeySetup();
    }
  }
}

/**
 * Side panel Options: open if missing; focus if open behind another tab;
 * close only when an Options tab is already the active tab.
 */
export async function toggleOptionsPage() {
  if (toggleInFlight) return;
  toggleInFlight = true;
  try {
    const tabs = await findOptionsTabs();
    if (!tabs.length) {
      await chrome.runtime.openOptionsPage();
      return;
    }

    const activeOptions = tabs.find((t) => t.active && t.id !== undefined);
    if (activeOptions) {
      const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
      if (ids.length) await chrome.tabs.remove(ids);
      return;
    }

    const tab = tabs.find((t) => t.id !== undefined);
    if (!tab?.id) return;
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  } finally {
    toggleInFlight = false;
  }
}
