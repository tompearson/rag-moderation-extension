/**
 * Auto Nav: optional news-feed navigation on panel open, and close panel when the watch tab leaves Nextdoor.
 */
import { isNextdoorHost } from './nextdoorFeedNav.js';
import { AUTO_NAV_WATCH_TAB_SESSION_KEY } from './pageAccess.js';
import { loadSettings } from './userSettings.js';

/** @param {number} tabId */
export async function clearAutoNavWatchTabIfMatch(tabId) {
  const stored = await chrome.storage.session.get(AUTO_NAV_WATCH_TAB_SESSION_KEY);
  if (stored[AUTO_NAV_WATCH_TAB_SESSION_KEY] === tabId) {
    await chrome.storage.session.remove(AUTO_NAV_WATCH_TAB_SESSION_KEY);
  }
}

/**
 * @param {number} tabId
 * @param {chrome.tabs.Tab} tab
 */
async function maybeCloseSidePanelForAutoNav(tabId, tab) {
  const settings = await loadSettings();
  if (!settings.autoNavEnabled) return;

  const stored = await chrome.storage.session.get(AUTO_NAV_WATCH_TAB_SESSION_KEY);
  const watchTabId = stored[AUTO_NAV_WATCH_TAB_SESSION_KEY];
  if (typeof watchTabId !== 'number' || watchTabId !== tabId) return;
  if (isNextdoorHost(tab.url)) return;

  const windowId = tab.windowId;
  if (windowId == null) return;

  await chrome.sidePanel.close({ windowId }).catch(() => {});
}

export function registerAutoNavMonitor() {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url == null) return;
    maybeCloseSidePanelForAutoNav(tabId, tab).catch(() => {});
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    clearAutoNavWatchTabIfMatch(tabId).catch(() => {});
  });
}