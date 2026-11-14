import { isNextdoorHost } from './nextdoorFeedNav.js';

export const MODERATION_TARGET_TAB_SESSION_KEY = 'moderationTargetTabId';

/** Tab whose URL Auto Nav watches for leaving nextdoor.com (not updated on tab switch). */
export const AUTO_NAV_WATCH_TAB_SESSION_KEY = 'autoNavWatchTabId';

/**
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isReadablePageUrl(url) {
  if (!url) return false;
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('devtools://')
  ) {
    return false;
  }
  if (url.includes('chrome.google.com/webstore')) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * @param {string} pageUrl
 * @returns {string | null}
 */
export function originPatternForPageUrl(pageUrl) {
  try {
    const origin = new URL(pageUrl).origin;
    if (origin === 'null') return null;
    return `${origin}/*`;
  } catch {
    return null;
  }
}

/**
 * Request optional host access for scripting on this origin (call from side panel on button click).
 * @param {string} pageUrl
 * @returns {Promise<boolean>}
 */
export async function ensureOriginScriptPermission(pageUrl) {
  const pattern = originPatternForPageUrl(pageUrl);
  if (!pattern) return false;
  if (await chrome.permissions.contains({ origins: [pattern] })) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

/**
 * Resolve the browser tab to read (side panel: prefer tab in this window, not chrome:// pages).
 * @returns {Promise<number>}
 */
/**
 * Tabs eligible for in-page pick / capture (Nextdoor web only).
 * @param {chrome.tabs.Tab | undefined} tab
 * @returns {number | null}
 */
export function moderationCaptureTabId(tab) {
  if (tab?.id && isReadablePageUrl(tab.url) && isNextdoorHost(tab.url)) return tab.id;
  return null;
}

export const PICK_REQUIRES_ACTIVE_NEXTDOOR_MSG =
  'Page capture and Moderate use your Nextdoor tab. Switch to Nextdoor, or open the news feed from here after you press Navigate now.';

export const PICK_NO_NEXTDOOR_FOCUS_MSG =
  'No Nextdoor tab in focus. Switch to a Nextdoor post or the news feed—or paste text in the content box and click Moderate.';

/**
 * Pick uses the active tab in the window only (no background Nextdoor tab fallback).
 * @param {chrome.tabs.Tab | undefined} activeInWindow
 * @returns {number}
 */
export function resolvePickTabIdForSidePanel(activeInWindow) {
  const fromActive = moderationCaptureTabId(activeInWindow);
  if (fromActive != null) return fromActive;

  const url = activeInWindow?.url;
  if (url && isReadablePageUrl(url) && !isNextdoorHost(url)) {
    throw new Error(PICK_REQUIRES_ACTIVE_NEXTDOOR_MSG);
  }

  throw new Error(PICK_NO_NEXTDOOR_FOCUS_MSG);
}

/**
 * @param {number} windowId
 * @returns {Promise<chrome.tabs.Tab | undefined>}
 */
export async function getActiveTabInWindow(windowId) {
  const [active] = await chrome.tabs.query({ active: true, windowId });
  return active;
}

export async function resolveCaptureTabIdFromSidePanel() {
  const win = await chrome.windows.getCurrent();
  if (win.id == null) {
    throw new Error(PICK_NO_NEXTDOOR_FOCUS_MSG);
  }
  const active = await getActiveTabInWindow(win.id);
  return resolvePickTabIdForSidePanel(active);
}

/**
 * @param {chrome.tabs.Tab | undefined} activeTab
 * @returns {boolean}
 */
export function isActiveTabNextdoorForModeration(activeTab) {
  try {
    resolvePickTabIdForSidePanel(activeTab);
    return true;
  } catch {
    return false;
  }
}

/** @returns {Promise<boolean>} */
export async function isActiveTabNextdoorInPanelWindow() {
  const win = await chrome.windows.getCurrent();
  if (win.id == null) return false;
  const active = await getActiveTabInWindow(win.id);
  return isActiveTabNextdoorForModeration(active);
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function friendlyTabCaptureError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('switch to the page')) return msg;
  if (
    lower.includes('cannot access') ||
    lower.includes('extension manifest must request permission') ||
    lower.includes('host permission')
  ) {
    return 'Allow site access when Chrome prompts, or click the extension icon on the page tab, then try again.';
  }
  if (
    lower.includes('extensions gallery') ||
    lower.includes('chrome://') ||
    lower.includes('restricted')
  ) {
    return 'This page can’t be read. Copy the text and use Paste instead.';
  }
  if (lower.includes('activeTab') || lower.includes('permission')) {
    return 'Click the extension icon on the page tab, then try again.';
  }
  return msg || 'Could not read the page.';
}
