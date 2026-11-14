import { isNextdoorNewsFeedUrl } from './nextdoorFeedNav.js';
import { ensureOriginScriptPermission } from './pageAccess.js';
import {
  MODERATION_QUEUE_COUNT_SESSION_KEY,
  MODERATION_QUEUE_PATH_SESSION_KEY,
  MODERATION_QUEUE_UPDATED_SESSION_KEY,
  READ_MODERATION_QUEUE_COUNT_MESSAGE,
  moderationQueueCountFromSession,
} from './nextdoorModerationQueueSession.js';

const LOAD_POLL_MS = 200;
const PEEK_ATTEMPTS = 20;
const PEEK_RETRY_MS = 350;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {number} tabId
 * @returns {Promise<void>}
 */
async function waitForTabComplete(tabId) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return;
    if (tab.status === 'complete') return;
    await delay(LOAD_POLL_MS);
  }
}

/**
 * @param {number} tabId
 * @returns {Promise<number | null>}
 */
async function readCountViaContentMessage(tabId) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: READ_MODERATION_QUEUE_COUNT_MESSAGE,
  });
  const count = response?.count;
  return typeof count === 'number' && count > 0 ? count : null;
}

/**
 * @param {number} tabId
 * @param {string} pageUrl
 * @returns {Promise<number | null>}
 */
async function readCountViaInject(tabId, pageUrl) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/moderationQueuePeek.js'],
      func: () => {
        const peek = window.__ragModerationQueuePeek;
        return typeof peek === 'function' ? peek() : null;
      },
    });
    const raw = results?.[0]?.result;
    return typeof raw === 'number' && raw > 0 ? raw : null;
  } catch {
    const granted = await ensureOriginScriptPermission(pageUrl);
    if (!granted) return null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/moderationQueuePeek.js'],
        func: () => {
          const peek = window.__ragModerationQueuePeek;
          return typeof peek === 'function' ? peek() : null;
        },
      });
      const raw = results?.[0]?.result;
      return typeof raw === 'number' && raw > 0 ? raw : null;
    } catch {
      return null;
    }
  }
}

/**
 * @param {string | undefined} tabUrl
 * @returns {Promise<number | null>}
 */
async function readCountFromSessionForTab(tabUrl) {
  const session = await chrome.storage.session.get([
    MODERATION_QUEUE_COUNT_SESSION_KEY,
    MODERATION_QUEUE_PATH_SESSION_KEY,
    MODERATION_QUEUE_UPDATED_SESSION_KEY,
  ]);
  return moderationQueueCountFromSession(tabUrl, session);
}

/**
 * @param {number} tabId
 * @returns {Promise<number | null>}
 */
export async function peekNextdoorModerationQueueCount(tabId) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab?.id == null || !isNextdoorNewsFeedUrl(tab.url)) return null;

  const pageUrl = tab.url || '';
  await waitForTabComplete(tabId);

  for (let i = 0; i < PEEK_ATTEMPTS; i += 1) {
    const fromSession = await readCountFromSessionForTab(tab.url);
    if (fromSession != null) return fromSession;

    try {
      const fromMessage = await readCountViaContentMessage(tabId);
      if (fromMessage != null) return fromMessage;
    } catch {
      const fromInject = await readCountViaInject(tabId, pageUrl);
      if (fromInject != null) return fromInject;
    }

    await delay(PEEK_RETRY_MS);
    const refreshed = await chrome.tabs.get(tabId).catch(() => null);
    if (refreshed?.id == null || !isNextdoorNewsFeedUrl(refreshed.url)) return null;
  }

  return readCountFromSessionForTab(tab.url);
}