/**
 * Universal may return HTTP 200 with decision "Error" (RAG/Gemini failures).
 * @param {unknown} result
 * @returns {boolean}
 */
export function isModerationFailureResult(result) {
  if (!result || typeof result !== 'object') return false;
  const decision = String(/** @type {Record<string, unknown>} */ (result).decision || '').trim();
  return decision.toLowerCase() === 'error';
}

/**
 * Short status line for the side panel (not the full reason block).
 * @param {unknown} result
 * @returns {string}
 */
export function moderationFailureStatusMessage(result) {
  if (!result || typeof result !== 'object') return 'Moderation failed.';
  const reason = String(/** @type {Record<string, unknown>} */ (result).reason || '').trim();
  if (!reason) return 'Moderation failed.';
  if (/quota|gemini/i.test(reason)) {
    return 'Gemini API quota exceeded on the server. Try again later or restore billing/keys (see Universal / Render).';
  }
  if (/503|unavailable/i.test(reason)) {
    return reason.length > 220 ? `${reason.slice(0, 220)}…` : reason;
  }
  return reason.length > 220 ? `${reason.slice(0, 220)}…` : reason;
}
