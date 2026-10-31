import { normalizeCapturedText } from './captureText.js';
import { friendlyTabCaptureError, isReadablePageUrl } from './pageAccess.js';

export { friendlyTabCaptureError };

/**
 * @returns {Promise<chrome.tabs.Tab>}
 */
export async function queryActiveTabInLastFocusedWindow() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs[0];
  if (!tab?.id) {
    throw new Error('No active tab found. Focus the page with the post, then try again.');
  }
  return tab;
}

/**
 * @param {number} tabId
 * @returns {Promise<string>}
 */
export async function readSelectionFromTab(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const t = window.getSelection()?.toString?.() ?? '';
        return t.trim();
      },
    });
    const raw = results?.[0]?.result;
    return normalizeCapturedText(typeof raw === 'string' ? raw : '');
  } catch (err) {
    throw new Error(friendlyTabCaptureError(err));
  }
}

/**
 * @param {number} [tabId]
 * @returns {Promise<string>}
 */
export async function captureSelectionFromTab(tabId) {
  let id = tabId;
  if (id == null) {
    const tab = await queryActiveTabInLastFocusedWindow();
    if (!isReadablePageUrl(tab.url)) {
      throw new Error('This page can’t be read. Copy the text and use Paste instead.');
    }
    id = tab.id;
  } else {
    const tab = await chrome.tabs.get(id);
    if (!isReadablePageUrl(tab.url)) {
      throw new Error('This page can’t be read. Copy the text and use Paste instead.');
    }
  }
  return readSelectionFromTab(id);
}

/** @deprecated use captureSelectionFromTab */
export async function captureSelectionFromActiveTab() {
  return captureSelectionFromTab();
}
