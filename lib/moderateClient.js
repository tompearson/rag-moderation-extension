import {
  DEFAULT_MODERATE_TIMEOUT_SEC,
  moderateTimeoutMs,
} from './moderationTimeout.js';
import { GOOGLE_AI_STUDIO_KEYS_URL } from './geminiApiOrigin.js';
import { isGeminiQuotaOrBillingIssue } from './moderationResult.js';

export { DEFAULT_MODERATE_TIMEOUT_SEC, moderateTimeoutMs };

/**
 * @param {Response} response
 * @param {string} responseText
 * @returns {string}
 */
export function formatHttpError(response, responseText) {
  const status = response.status;
  let detail = (responseText || '').replace(/\s+/g, ' ').trim().slice(0, 280);
  try {
    const parsed = JSON.parse(responseText);
    detail =
      parsed.error ||
      parsed.message ||
      parsed.detail ||
      (parsed.reason && String(parsed.reason)) ||
      detail;
    if (detail && typeof detail !== 'string') detail = JSON.stringify(detail).slice(0, 280);
  } catch {
    // plain text
  }

  if (status === 401) return 'Authentication failed (401). Check moderator access on the API host.';
  if (status === 423) return `Access revoked (423). ${detail}`;
  if (status === 503 && /quota|rag|gemini/i.test(detail)) {
    const base = `Service unavailable (503): ${detail}`;
    return isGeminiQuotaOrBillingIssue(detail)
      ? `${base} Google AI Studio: ${GOOGLE_AI_STUDIO_KEYS_URL}`
      : base;
  }
  if (isGeminiQuotaOrBillingIssue(detail)) {
    return `${detail} Google AI Studio: ${GOOGLE_AI_STUDIO_KEYS_URL}`;
  }
  if (status >= 500) return `Server error (${status})${detail ? `: ${detail}` : ''}`;
  return `Request failed (${status})${detail ? `: ${detail}` : ''}`;
}

/**
 * Unwrap dev-server / Vercel moderation response.
 * @param {unknown} data
 * @returns {Record<string, unknown>}
 */
export function unwrapModerationResult(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Empty moderation response');
  }
  const obj = /** @type {Record<string, unknown>} */ (data);
  if (obj.success === false) {
    throw new Error(String(obj.error || obj.message || 'Moderation failed'));
  }
  if (obj.data && typeof obj.data === 'object') {
    return /** @type {Record<string, unknown>} */ (obj.data);
  }
  return obj;
}

/**
 * @param {string} moderateUrl
 * @param {object} body
 * @param {{ signal?: AbortSignal; timeoutMs?: number }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function postModerate(moderateUrl, body, options = {}) {
  const { signal: externalSignal, timeoutMs = moderateTimeoutMs(DEFAULT_MODERATE_TIMEOUT_SEC) } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(moderateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(formatHttpError(res, text));
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }
    return unwrapModerationResult(parsed);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (externalSignal?.aborted) {
        throw new Error('Moderation stopped.');
      }
      const sec = Math.round(timeoutMs / 1000);
      throw new Error(`Moderation timed out after ${sec}s. Increase the limit in Options or try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
