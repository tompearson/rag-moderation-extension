/**
 * In-page pick and Moderate require the focused browser tab to be on nextdoor.com.
 */
import { isNextdoorHost } from './nextdoorFeedNav.js';
import { isReadablePageUrl } from './readablePageUrl.js';

export const NEXTDOOR_REQUIRED_MSG =
  'Page capture and Moderate use your Nextdoor tab. Switch to Nextdoor, or open the news feed from here after you press Navigate now.';

export const NEXTDOOR_FOCUS_MISSING_MSG =
  'No Nextdoor tab in focus. Switch to a Nextdoor post or the news feed—or paste text in the content box and click Moderate.';

/** @deprecated Use {@link NEXTDOOR_REQUIRED_MSG} */
export const PICK_REQUIRES_ACTIVE_NEXTDOOR_MSG = NEXTDOOR_REQUIRED_MSG;

/** @deprecated Use {@link NEXTDOOR_FOCUS_MISSING_MSG} */
export const PICK_NO_NEXTDOOR_FOCUS_MSG = NEXTDOOR_FOCUS_MISSING_MSG;

/**
 * @param {chrome.tabs.Tab | undefined} tab
 * @returns {number | null}
 */
export function moderationCaptureTabId(tab) {
  if (tab?.id && isReadablePageUrl(tab.url) && isNextdoorHost(tab.url)) return tab.id;
  return null;
}

/**
 * @param {chrome.tabs.Tab | undefined} activeInWindow
 * @returns {number}
 */
export function resolvePickTabIdForSidePanel(activeInWindow) {
  const fromActive = moderationCaptureTabId(activeInWindow);
  if (fromActive != null) return fromActive;

  const url = activeInWindow?.url;
  if (url && isReadablePageUrl(url) && !isNextdoorHost(url)) {
    throw new Error(NEXTDOOR_REQUIRED_MSG);
  }

  throw new Error(NEXTDOOR_FOCUS_MISSING_MSG);
}

/**
 * @param {chrome.tabs.Tab | undefined} activeTab
 * @returns {boolean}
 */
export function isFocusedTabNextdoor(activeTab) {
  try {
    resolvePickTabIdForSidePanel(activeTab);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {number} windowId
 * @returns {Promise<chrome.tabs.Tab | undefined>}
 */
export async function getActiveTabInWindow(windowId) {
  const [active] = await chrome.tabs.query({ active: true, windowId });
  return active;
}

/** @returns {Promise<boolean>} */
export async function isFocusedTabNextdoorInPanelWindow() {
  const win = await chrome.windows.getCurrent();
  if (win.id == null) return false;
  const active = await getActiveTabInWindow(win.id);
  return isFocusedTabNextdoor(active);
}

/**
 * @returns {Promise<number>}
 */
export async function resolveCaptureTabIdFromSidePanel() {
  const win = await chrome.windows.getCurrent();
  if (win.id == null) {
    throw new Error(NEXTDOOR_FOCUS_MISSING_MSG);
  }
  const active = await getActiveTabInWindow(win.id);
  return resolvePickTabIdForSidePanel(active);
}