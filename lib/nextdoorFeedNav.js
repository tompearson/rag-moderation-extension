import {
  isReadablePageUrl,
  MODERATION_TARGET_TAB_SESSION_KEY,
  AUTO_NAV_WATCH_TAB_SESSION_KEY,
} from './pageAccess.js';

/** Default feed URL (matches public how-to guides). */
export const NEXTDOOR_NEWS_FEED_URL = 'https://nextdoor.com/news_feed/';

/**
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isNextdoorHost(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'nextdoor.com' || host.endsWith('.nextdoor.com');
  } catch {
    return false;
  }
}

/**
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isNextdoorNewsFeedUrl(url) {
  if (!url || !isNextdoorHost(url)) return false;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
    return path === '/news_feed';
  } catch {
    return false;
  }
}

/**
 * Lead/moderation queue feed — keep this tab when Auto Nav runs (do not open news_feed).
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isNextdoorModerationFeedUrl(url) {
  if (!url || !isNextdoorHost(url)) return false;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
    return path === '/moderation_feed';
  } catch {
    return false;
  }
}

/**
 * Active tab URLs where Auto Nav should pin the watch tab and not open news_feed.
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function isNextdoorAutoNavHomeTabUrl(url) {
  return isNextdoorNewsFeedUrl(url) || isNextdoorModerationFeedUrl(url);
}

/**
 * Whether the tab should navigate to the neighborhood news feed when Auto Nav runs.
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function shouldNavigateTabToNewsFeed(url) {
  if (!isReadablePageUrl(url)) return false;
  if (isNextdoorAutoNavHomeTabUrl(url)) return false;
  return true;
}

/**
 * @deprecated Use {@link shouldNavigateTabToNewsFeed}
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function shouldAutoOpenNextdoorNewsFeed(url) {
  return shouldNavigateTabToNewsFeed(url) && !isNextdoorHost(url);
}

/**
 * Open news feed without reusing the user's current tab URL (e.g. Gmail).
 * Only reuses the tab when it is already the active news feed — never jumps to a background feed tab.
 * @returns {Promise<{ kind: 'already' | 'create'; tabId?: number }>}
 */
async function resolveNewsFeedOpenPlan() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id != null && isNextdoorAutoNavHomeTabUrl(active.url)) {
    return { kind: 'already', tabId: active.id };
  }

  return { kind: 'create' };
}

/**
 * Open a new Nextdoor news feed tab (or keep the current tab when it is already the feed).
 * @param {{ enabled?: boolean; force?: boolean }} [opts]
 * @returns {Promise<{ navigated: boolean; tabId?: number }>}
 */
export async function openNextdoorNewsFeedForModeration(opts = {}) {
  const { enabled = true, force = false } = opts;
  if (!enabled && !force) {
    return { navigated: false };
  }

  const plan = await resolveNewsFeedOpenPlan();

  async function pinAutoNavTabs(tabId) {
    await chrome.storage.session.set({
      [MODERATION_TARGET_TAB_SESSION_KEY]: tabId,
      [AUTO_NAV_WATCH_TAB_SESSION_KEY]: tabId,
    });
  }

  if (plan.kind === 'already' && plan.tabId != null) {
    await pinAutoNavTabs(plan.tabId);
    return { navigated: false, tabId: plan.tabId };
  }

  const tab = await chrome.tabs.create({ url: NEXTDOOR_NEWS_FEED_URL, active: true });
  if (tab.id != null) {
    await pinAutoNavTabs(tab.id);
  }
  return { navigated: true, tabId: tab.id };
}