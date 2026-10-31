import { normalizeCapturedText } from './captureText.js';
import { friendlyTabCaptureError, isReadablePageUrl } from './pageAccess.js';
import { queryActiveTabInLastFocusedWindow } from './tabSelectionCapture.js';

/** @type {Map<number, { resolve: (text: string) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>} */
export const pickModeWaiters = new Map();

const PICK_TIMEOUT_MS = 120_000;

/**
 * @param {number} tabId
 * @returns {Promise<string>}
 */
export function waitForPickOnTab(tabId) {
  const existing = pickModeWaiters.get(tabId);
  if (existing) {
    clearTimeout(existing.timer);
    existing.reject(new Error('Pick replaced.'));
    pickModeWaiters.delete(tabId);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pickModeWaiters.delete(tabId);
      reject(new Error('Pick timed out. Press Esc on the page or try again.'));
    }, PICK_TIMEOUT_MS);

    pickModeWaiters.set(tabId, {
      resolve: (text) => {
        clearTimeout(timer);
        resolve(text);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
      timer,
    });
  });
}

/**
 * @param {'PICK_MODE_COMPLETE' | 'PICK_MODE_CANCELLED'} type
 * @param {number | undefined} tabId
 * @param {string} [text]
 */
export function settlePickModeMessage(type, tabId, text) {
  if (tabId == null) return;
  const waiter = pickModeWaiters.get(tabId);
  if (!waiter) return;
  pickModeWaiters.delete(tabId);
  if (type === 'PICK_MODE_COMPLETE') {
    waiter.resolve(normalizeCapturedText(text));
  } else {
    waiter.reject(new Error('Pick cancelled.'));
  }
}

/**
 * @param {number} tabId
 * @returns {Promise<string>}
 */
export async function startPickModeOnTab(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!isReadablePageUrl(tab.url)) {
    throw new Error('This page can’t be read. Copy the text and use Paste instead.');
  }

  const pickPromise = waitForPickOnTab(tabId);
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/pageTextExtract.js', 'content/pickMode.js'],
    });
  } catch (err) {
    pickModeWaiters.delete(tabId);
    throw new Error(friendlyTabCaptureError(err));
  }
  return pickPromise;
}

/**
 * @param {number} [tabId]
 * @returns {Promise<string>}
 */
export async function startPickModeOnActiveTab(tabId) {
  let id = tabId;
  if (id == null) {
    const tab = await queryActiveTabInLastFocusedWindow();
    id = tab.id;
  }
  return startPickModeOnTab(id);
}
