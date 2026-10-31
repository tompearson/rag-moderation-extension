const MAX_EMAIL_LEN = 254;

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeReportEmail(raw) {
  if (raw == null) return '';
  return String(raw).trim();
}

/**
 * Non-empty, human-style address (shareReportEmail gate).
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isValidReportEmail(raw) {
  const s = normalizeReportEmail(raw);
  if (!s || s.length > MAX_EMAIL_LEN) return false;
  if (/\s/.test(s)) return false;
  const at = s.indexOf('@');
  if (at <= 0 || at === s.length - 1) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain.includes('.')) return false;
  if (s.includes('..')) return false;
  return true;
}

/**
 * @param {unknown} raw
 * @returns {string | null} Normalized email or null if invalid/non-empty check failed.
 */
export function parseReportEmailOrNull(raw) {
  const s = normalizeReportEmail(raw);
  if (!s) return '';
  return isValidReportEmail(s) ? s : null;
}
