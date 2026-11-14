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