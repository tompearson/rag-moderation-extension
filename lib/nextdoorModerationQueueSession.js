/** @typedef {{ count: number; pathname: string; updatedAt: number }} ModerationQueueSessionSnapshot */

export const MODERATION_QUEUE_COUNT_SESSION_KEY = 'nextdoorModerationQueueCount';
export const MODERATION_QUEUE_PATH_SESSION_KEY = 'nextdoorModerationQueuePathname';
export const MODERATION_QUEUE_UPDATED_SESSION_KEY = 'nextdoorModerationQueueUpdatedAt';

export const READ_MODERATION_QUEUE_COUNT_MESSAGE = 'READ_MODERATION_QUEUE_COUNT';

export const PENDING_AUTO_MODERATE_COUNT_SESSION_KEY = 'pendingAutoModerateQueueCount';

const STALE_MS = 120_000;

/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function newsFeedPathnameFromUrl(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
    return path === '/news_feed' ? path : null;
  } catch {
    return null;
  }
}

/**
 * @param {string | undefined} tabUrl
 * @param {Record<string, unknown>} session
 * @returns {number | null}
 */
export function moderationQueueCountFromSession(tabUrl, session) {
  const tabPath = newsFeedPathnameFromUrl(tabUrl);
  if (!tabPath) return null;

  const count = session[MODERATION_QUEUE_COUNT_SESSION_KEY];
  const path = session[MODERATION_QUEUE_PATH_SESSION_KEY];
  const updatedAt = session[MODERATION_QUEUE_UPDATED_SESSION_KEY];

  if (path !== tabPath || typeof updatedAt !== 'number') return null;
  if (Date.now() - updatedAt > STALE_MS) return null;
  if (typeof count !== 'number' || count <= 0) return null;
  return count;
}