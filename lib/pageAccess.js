export const MODERATION_TARGET_TAB_SESSION_KEY = 'moderationTargetTabId';

/** Tab whose URL Auto Nav watches for leaving nextdoor.com (not updated on tab switch). */
export const AUTO_NAV_WATCH_TAB_SESSION_KEY = 'autoNavWatchTabId';

/** User chose Stay on news feed for Auto Moderate queue prompt this browser session. */
export const AUTO_MODERATE_DISMISSED_SESSION_KEY = 'autoModerateQueueDismissed';

/** Written by the Nextdoor content script when queue count &gt; 0 and prompt not dismissed. */
export const PENDING_AUTO_MODERATE_COUNT_SESSION_KEY = 'pendingAutoModerateQueueCount';

export {
  moderationCaptureTabId,
  resolvePickTabIdForSidePanel,
  resolveCaptureTabIdFromSidePanel,
  getActiveTabInWindow,
  isFocusedTabNextdoor,
  isFocusedTabNextdoorInPanelWindow,
  isFocusedTabNextdoor as isActiveTabNextdoorForModeration,
  isFocusedTabNextdoorInPanelWindow as isActiveTabNextdoorInPanelWindow,
  NEXTDOOR_REQUIRED_MSG,
  NEXTDOOR_FOCUS_MISSING_MSG,
  PICK_REQUIRES_ACTIVE_NEXTDOOR_MSG,
  PICK_NO_NEXTDOOR_FOCUS_MSG,
} from './moderationDomain.js';

export { isReadablePageUrl } from './readablePageUrl.js';

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