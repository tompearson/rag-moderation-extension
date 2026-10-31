import {
  ensureOriginScriptPermission,
  isReadablePageUrl,
  resolveCaptureTabIdFromSidePanel,
} from './pageAccess.js';

/**
 * Side panel only: resolve page tab + request host access (user gesture on button).
 * @returns {Promise<number>}
 */
export async function prepareTabCaptureFromSidePanel() {
  const tabId = await resolveCaptureTabIdFromSidePanel();
  const tab = await chrome.tabs.get(tabId);
  if (!isReadablePageUrl(tab.url)) {
    throw new Error('This page can’t be read. Copy the text and use Paste instead.');
  }
  const granted = await ensureOriginScriptPermission(tab.url);
  if (!granted) {
    throw new Error(
      'Site access is required to click text on the page. Allow the Chrome prompt, then try again.',
    );
  }
  return tabId;
}
