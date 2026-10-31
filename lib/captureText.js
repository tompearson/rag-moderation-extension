/** Max characters filled from page selection / pick (moderation payload safety). */
export const MAX_CAPTURE_CHARS = 32_000;

/**
 * @param {string | null | undefined} raw
 * @returns {string}
 */
export function normalizeCapturedText(raw) {
  if (raw == null) return '';
  return String(raw).trim().slice(0, MAX_CAPTURE_CHARS);
}
