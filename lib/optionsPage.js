const optionsPagePath = 'options/options.html';

function getOptionsPageUrl() {
  return chrome.runtime.getURL(optionsPagePath);
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
