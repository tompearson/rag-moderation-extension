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
 * Whether the tab should navigate to the neighborhood news feed when Auto Nav runs.
 * @param {string | undefined} url
 * @returns {boolean}
 */
export function shouldNavigateTabToNewsFeed(url) {
  if (!isReadablePageUrl(url)) return false;
  if (isNextdoorNewsFeedUrl(url)) return false;
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
 * @returns {Promise<number | 'create' | null>}
 */
async function resolveTabIdToNavigate() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id != null && shouldNavigateTabToNewsFeed(active.url)) {
    return active.id;
  }
  if (active?.id != null && isReadablePageUrl(active.url) && !shouldNavigateTabToNewsFeed(active.url)) {
    return null;
  }

  const stored = await chrome.storage.session.get(MODERATION_TARGET_TAB_SESSION_KEY);
  const storedId = stored[MODERATION_TARGET_TAB_SESSION_KEY];
  if (typeof storedId === 'number') {
    const tab = await chrome.tabs.get(storedId).catch(() => null);
    if (tab?.id != null && shouldNavigateTabToNewsFeed(tab.url)) {
      return tab.id;
    }
  }

  const windowTabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of windowTabs) {
    if (tab.id != null && shouldNavigateTabToNewsFeed(tab.url)) {
      return tab.id;
    }
  }

  return 'create';
}

/**
 * Open or focus the Nextdoor news feed in the current window when the side panel opens.
 * @param {{ enabled?: boolean; force?: boolean }} [opts]
 * @returns {Promise<{ navigated: boolean; tabId?: number }>}
 */
export async function openNextdoorNewsFeedForModeration(opts = {}) {
  const { enabled = true, force = false } = opts;
  if (!enabled && !force) {
    return { navigated: false };
  }

  const target = await resolveTabIdToNavigate();
  if (target === null) {
    if (enabled) {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (active?.id != null && isNextdoorNewsFeedUrl(active.url)) {
        await chrome.storage.session.set({ [AUTO_NAV_WATCH_TAB_SESSION_KEY]: active.id });
      }
    }
    return { navigated: false };
  }

  async function pinAutoNavTabs(tabId) {
    await chrome.storage.session.set({
      [MODERATION_TARGET_TAB_SESSION_KEY]: tabId,
      [AUTO_NAV_WATCH_TAB_SESSION_KEY]: tabId,
    });
  }

  if (target === 'create') {
    const tab = await chrome.tabs.create({ url: NEXTDOOR_NEWS_FEED_URL, active: true });
    if (tab.id != null) {
      await pinAutoNavTabs(tab.id);
    }
    return { navigated: true, tabId: tab.id };
  }

  await chrome.tabs.update(target, { url: NEXTDOOR_NEWS_FEED_URL, active: true });
  await pinAutoNavTabs(target);
  return { navigated: true, tabId: target };
}