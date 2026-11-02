/** Direct Gemini REST probe from the extension (no Universal hop). */

import { GEMINI_GENERATIVE_ORIGIN } from './geminiApiOrigin.js';

export { GEMINI_GENERATIVE_ORIGIN };

export const VALIDATE_GEMINI_CLIENT_TIMEOUT_MS = 22_000;

/** Fast models first; 404 → try next. */
const VALIDATE_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

/**
 * @param {unknown} body
 * @param {number} status
 * @returns {string}
 */
function formatGoogleError(body, status) {
  if (body && typeof body === 'object') {
    const err = /** @type {{ error?: { message?: string; status?: string } }} */ (body).error;
    if (err?.message) {
      const prefix = err.status ? `[${err.status}] ` : '';
      return `${prefix}${err.message}`.slice(0, 400);
    }
  }
  return `Google API error (${status})`;
}

/**
 * @param {string} message
 * @returns {boolean}
 */
function looksLikeInvalidKey(message) {
  const m = message.toLowerCase();
  return (
    m.includes('api key not valid') ||
    m.includes('api_key_invalid') ||
    m.includes('invalid api key') ||
    (m.includes('permission denied') && m.includes('api key'))
  );
}

/**
 * @param {string} rawKey
 * @returns {string}
 */
export function normalizeGeminiApiKey(rawKey) {
  if (typeof rawKey !== 'string') return '';
  return rawKey.replace(/\s+/g, '').trim();
}

/**
 * @param {string} rawKey
 * @returns {Promise<{ valid: boolean; message?: string; error?: string; rateLimited?: boolean }>}
 */
export async function validateGeminiKeyClient(rawKey) {
  const apiKey = normalizeGeminiApiKey(rawKey);
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  if (apiKey.length < 30) {
    return { valid: false, error: 'API key looks too short' };
  }

  let lastError = '';

  for (const model of VALIDATE_MODELS) {
    const url = `${GEMINI_GENERATIVE_ORIGIN}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
        }),
        signal: AbortSignal.timeout(VALIDATE_GEMINI_CLIENT_TIMEOUT_MS),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (res.ok) {
        return {
          valid: true,
          message: `Key works with ${model} (checked from this browser via Google).`,
        };
      }

      const errMsg = formatGoogleError(data, res.status);
      if (res.status === 429) {
        return {
          valid: false,
          rateLimited: true,
          error: errMsg || 'Google rate limit — try again shortly.',
        };
      }

      if (res.status === 404) {
        lastError = errMsg;
        continue;
      }

      if (looksLikeInvalidKey(errMsg)) {
        return { valid: false, error: `API key test failed: ${errMsg}` };
      }

      lastError = errMsg;
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        return {
          valid: false,
          error:
            `Google did not respond within ${VALIDATE_GEMINI_CLIENT_TIMEOUT_MS / 1000}s. Check network or try again.`,
        };
      }
      return {
        valid: false,
        error:
          `Could not reach Google (${GEMINI_GENERATIVE_ORIGIN}). Allow the Generative Language API host when prompted, or reload the extension.`,
      };
    }
  }

  return {
    valid: false,
    error: lastError ? `API key test failed: ${lastError}` : 'Could not validate key with Google.',
  };
}
