import { isModerationFailureResult } from './moderationResult.js';
import { resolveUserApiKeyForModeration } from './geminiByok.js';

/** Free shared-pool moderations per install (matches privacy policy). */
export const SHARED_POOL_MODERATION_LIMIT = 5;

export const SHARED_POOL_STORAGE_KEY = 'sharedPoolModerationsUsed';

/**
 * @param {unknown} value
 * @returns {number}
 */
export function clampSharedPoolUsedCount(value) {
  const n = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(SHARED_POOL_MODERATION_LIMIT, n));
}

/**
 * @param {number} used
 * @returns {number}
 */
export function getSharedPoolRemaining(used) {
  return Math.max(0, SHARED_POOL_MODERATION_LIMIT - clampSharedPoolUsedCount(used));
}

/**
 * Side panel / Options: short label when on shared pool (omit when BYOK key saved).
 * @param {number} remaining
 * @returns {string}
 */
export function formatSharedPoolRemainingLabel(remaining) {
  const left = Math.max(
    0,
    Math.min(SHARED_POOL_MODERATION_LIMIT, Math.floor(Number(remaining) || 0)),
  );
  if (left === 0) {
    return `Shared pool: no moderations left (${SHARED_POOL_MODERATION_LIMIT} used)`;
  }
  return `Shared pool: ${left} of ${SHARED_POOL_MODERATION_LIMIT} moderations left`;
}

/**
 * @param {{ geminiApiKey?: string }} settings
 * @returns {boolean}
 */
export function usesSharedPoolForModeration(settings) {
  return resolveUserApiKeyForModeration(settings) == null;
}

export async function getSharedPoolModerationsUsed() {
  const stored = await chrome.storage.local.get(SHARED_POOL_STORAGE_KEY);
  return clampSharedPoolUsedCount(stored[SHARED_POOL_STORAGE_KEY]);
}

/**
 * @param {{ geminiApiKey?: string }} settings
 * @returns {Promise<boolean>}
 */
export async function canUseSharedPoolForModeration(settings) {
  if (!usesSharedPoolForModeration(settings)) return true;
  const used = await getSharedPoolModerationsUsed();
  return used < SHARED_POOL_MODERATION_LIMIT;
}

/**
 * @param {{ geminiApiKey?: string }} settings
 * @returns {Promise<string | null>}
 */
export async function sharedPoolModerationBlockMessage(settings) {
  if (!usesSharedPoolForModeration(settings)) return null;
  const used = await getSharedPoolModerationsUsed();
  if (used < SHARED_POOL_MODERATION_LIMIT) return null;
  return sharedPoolLimitExceededMessage();
}

/**
 * @param {{ geminiApiKey?: string }} settings
 * @returns {Promise<void>}
 */
export async function assertCanUseSharedPoolForModeration(settings) {
  const block = await sharedPoolModerationBlockMessage(settings);
  if (block) throw new Error(block);
}

/**
 * @param {unknown} result
 * @param {{ geminiApiKey?: string }} settings
 * @returns {Promise<void>}
 */
export async function recordSharedPoolModerationSuccessIfApplicable(settings, result) {
  if (!usesSharedPoolForModeration(settings)) return;
  if (isModerationFailureForQuota(result)) return;
  const used = await getSharedPoolModerationsUsed();
  if (used >= SHARED_POOL_MODERATION_LIMIT) return;
  await chrome.storage.local.set({ [SHARED_POOL_STORAGE_KEY]: used + 1 });
}

/**
 * @param {unknown} result
 * @returns {boolean}
 */
function isModerationFailureForQuota(result) {
  return isModerationFailureResult(result);
}

export const SHARED_POOL_TRIAL_GEMINI_GUIDE_URL =
  'https://www.airesearchdog.net/extension/get-gemini-api-key';

export function sharedPoolLimitExceededMessageBody() {
  return (
    `Your free shared trial is over (${SHARED_POOL_MODERATION_LIMIT} moderations on this install). ` +
    'Open Options (header button or Your key badge) → Your Gemini API key (recommended) → paste your key → Save key ' +
    '(uses your Google quota, not the shared pool).'
  );
}

export function sharedPoolLimitExceededMessage() {
  return `${sharedPoolLimitExceededMessageBody()} Guide: ${SHARED_POOL_TRIAL_GEMINI_GUIDE_URL}`;
}

/**
 * @param {string} message
 * @returns {boolean}
 */
export function isSharedPoolLimitExceededMessage(message) {
  const msg = String(message || '');
  return (
    msg.startsWith('Shared pool limit reached') || msg.startsWith('Your free shared trial is over')
  );
}

export async function snapshotSharedPoolQuotaForFactoryReset() {
  return getSharedPoolModerationsUsed();
}

/**
 * @param {number} used
 * @returns {Promise<void>}
 */
export async function restoreSharedPoolQuotaAfterFactoryReset(used) {
  await chrome.storage.local.set({
    [SHARED_POOL_STORAGE_KEY]: clampSharedPoolUsedCount(used),
  });
}
