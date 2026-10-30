export const DEFAULT_MODERATE_TIMEOUT_SEC = 45;
export const MIN_MODERATE_TIMEOUT_SEC = 15;
export const MAX_MODERATE_TIMEOUT_SEC = 300;

/**
 * @param {unknown} value
 * @returns {number} Seconds within allowed range.
 */
export function parseModerateTimeoutSec(value) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_MODERATE_TIMEOUT_SEC;
  return Math.min(MAX_MODERATE_TIMEOUT_SEC, Math.max(MIN_MODERATE_TIMEOUT_SEC, Math.round(n)));
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function moderateTimeoutMs(value) {
  return parseModerateTimeoutSec(value) * 1000;
}
