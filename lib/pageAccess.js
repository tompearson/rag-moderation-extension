export const MODERATION_TARGET_TAB_SESSION_KEY = 'moderationTargetTabId';

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
export async function resolveCaptureTabIdFromSidePanel() {
  const tryTab = (/** @type {chrome.tabs.Tab | undefined} */ tab) => {
    if (tab?.id && isReadablePageUrl(tab.url)) return tab.id;
    return null;
  };

  const inWindow = await chrome.tabs.query({ active: true, currentWindow: true });
  const fromWindow = tryTab(inWindow[0]);
  if (fromWindow != null) return fromWindow;

  const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const fromFocused = tryTab(focused[0]);
  if (fromFocused != null) return fromFocused;

  const stored = await chrome.storage.session.get(MODERATION_TARGET_TAB_SESSION_KEY);
  const storedId = stored[MODERATION_TARGET_TAB_SESSION_KEY];
  if (typeof storedId === 'number') {
    const tab = await chrome.tabs.get(storedId).catch(() => null);
    const fromStored = tryTab(tab ?? undefined);
    if (fromStored != null) return fromStored;
  }

  throw new Error(
    'No post page tab found for Click on Text to Moderate. Open the post (e.g. Nextdoor), click that tab once, then try again—or use Moderate with text already in the box (no page tab needed).',
  );
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
