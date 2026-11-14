import { isNextdoorHost } from './nextdoorFeedNav.js';
import { AUTO_NAV_WATCH_TAB_SESSION_KEY } from './pageAccess.js';
import { loadSettings } from './userSettings.js';

/**
 * When Auto Nav is on, close the side panel if the Auto Nav watch tab leaves nextdoor.com.
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

/**
 * Register background listeners for Auto Nav panel close (call once from service worker).
 */
export function registerAutoNavMonitor() {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url == null) return;
    maybeCloseSidePanelForAutoNav(tabId, tab).catch(() => {});
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.get(AUTO_NAV_WATCH_TAB_SESSION_KEY).then((stored) => {
      if (stored[AUTO_NAV_WATCH_TAB_SESSION_KEY] === tabId) {
        return chrome.storage.session.remove(AUTO_NAV_WATCH_TAB_SESSION_KEY);
      }
      return undefined;
    });
  });
}