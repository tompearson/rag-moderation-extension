import { GOOGLE_AI_STUDIO_KEYS_URL } from './geminiApiOrigin.js';

export { GOOGLE_AI_STUDIO_KEYS_URL };

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
 * @param {string} text
 * @returns {boolean}
 */
export function isGeminiQuotaOrBillingIssue(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return (
    /quota|rate limit|resource_exhausted|billing|exhausted|429|503/.test(t) ||
    /gemini api|generativelanguage|google generative/.test(t)
  );
}

/** Drop RAG 503 footnote after the quota sentence (Pinecone /health noise). */
export function sanitizeModerationReason(text) {
  const raw = String(text || '').trim();
  if (!raw) return raw;
  const marker = 'gemini api quota exceeded.';
  const lower = raw.toLowerCase();
  const idx = lower.indexOf(marker);
  if (idx === -1) return raw;
  return raw.slice(0, idx + marker.length);
}

/**
 * Plain-text line (clipboard-friendly) including AI Studio URL.
 * @returns {string}
 */
export function geminiQuotaUserMessagePlain() {
  return (
    'Gemini API quota exceeded. Try again later. ' +
    `Manage or create a personal key in Google AI Studio: ${GOOGLE_AI_STUDIO_KEYS_URL}`
  );
}

/**
 * Short status line for the side panel (not the full reason block).
 * @param {unknown} result
 * @returns {string}
 */
export function moderationFailureStatusMessage(result) {
  if (!result || typeof result !== 'object') return 'Moderation failed.';
  const reason = sanitizeModerationReason(
    String(/** @type {Record<string, unknown>} */ (result).reason || '').trim(),
  );
  if (!reason) return 'Moderation failed.';
  if (isGeminiQuotaOrBillingIssue(reason)) {
    return geminiQuotaUserMessagePlain();
  }
  if (/503|unavailable/i.test(reason)) {
    return reason.length > 220 ? `${reason.slice(0, 220)}…` : reason;
  }
  return reason.length > 220 ? `${reason.slice(0, 220)}…` : reason;
}

/**
 * HTML snippet for results area (escaped wrapper, trusted link href).
 * @returns {string}
 */
export function geminiQuotaResultsHintHtml() {
  const href = GOOGLE_AI_STUDIO_KEYS_URL.replace(/"/g, '&quot;');
  return (
    `<p class="gemini-quota-hint muted">Quota or billing issue? ` +
    `<a href="${href}" target="_blank" rel="noopener noreferrer">Google AI Studio</a> for your own API key.</p>`
  );
}
