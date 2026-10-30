export const MODERATE_TIMEOUT_MS = 120_000;

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
  if (status === 503 && /quota|rag|gemini/i.test(detail)) return `Service unavailable (503): ${detail}`;
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
 * @param {AbortSignal} [signal]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function postModerate(moderateUrl, body, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATE_TIMEOUT_MS);
  const linked = signal
    ? (() => {
        if (signal.aborted) controller.abort();
        else signal.addEventListener('abort', () => controller.abort(), { once: true });
      })()
    : null;

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
      throw new Error(`Moderation timed out after ${MODERATE_TIMEOUT_MS / 1000}s (cold start may need up to 120s).`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
    void linked;
  }
}
