import { DEFAULT_RAG_PROVIDER } from './ragProviders.js';

/** Full V28 provider (non-RAG) — BYOK applies here in phase 1. */
export const NON_RAG_V28_PROVIDER = 'NextDoor-prompt-production-28';

/** Max wait for validate API (local dev-server offline otherwise hangs a long time). */
export const VALIDATE_GEMINI_KEY_TIMEOUT_MS = 25_000;

export const VALIDATE_GEMINI_KEY_BACKGROUND_TIMEOUT_MS = 30_000;

/**
 * @param {string | null | undefined} providerId
 * @returns {boolean}
 */
export function isRagProviderId(providerId) {
  const id = typeof providerId === 'string' ? providerId.trim() : '';
  if (!id) return true;
  if (id === DEFAULT_RAG_PROVIDER) return true;
  return id.endsWith('-rag') || id.includes('-rag');
}

/**
 * @param {{
 *   geminiByokEnabled?: boolean;
 *   geminiApiKey?: string;
 *   ragProvider?: string;
 * }} settings
 * @returns {boolean}
 */
export function isByokActiveForProvider(settings) {
  if (!settings?.geminiByokEnabled) return false;
  const key = typeof settings.geminiApiKey === 'string' ? settings.geminiApiKey.trim() : '';
  if (key.length < 30) return false;
  return !isRagProviderId(settings.ragProvider);
}

/**
 * @param {{
 *   geminiByokEnabled?: boolean;
 *   geminiApiKey?: string;
 *   ragProvider?: string;
 * }} settings
 * @returns {string | null}
 */
export function resolveUserApiKeyForModeration(settings) {
  if (!isByokActiveForProvider(settings)) return null;
  const key = settings.geminiApiKey.trim();
  return key.length >= 30 ? key : null;
}

/**
 * @param {string} apiOrigin
 * @param {string} apiKey
 * @returns {Promise<{ valid: boolean; message?: string; error?: string; rateLimited?: boolean }>}
 */
function validationUnreachableHint(apiOrigin) {
  if (/127\.0\.0\.1|localhost/i.test(apiOrigin)) {
    return ' Start Universal locally: npm run dev:server in Moderation-Tool-Universal. Or switch Options → Production.';
  }
  return ' Check host permission and that the API is up.';
}

export async function validateGeminiKey(apiOrigin, apiKey) {
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/providers`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validateGeminiKey', apiKey }),
      signal: AbortSignal.timeout(VALIDATE_GEMINI_KEY_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return {
        valid: false,
        error: `Validation timed out calling ${origin}.${validationUnreachableHint(origin)}`,
      };
    }
    return {
      valid: false,
      error: `Could not reach ${origin}.${validationUnreachableHint(origin)}`,
    };
  }
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    return { valid: false, error: `Validation failed (${res.status})` };
  }
  if (res.status === 429) {
    return {
      valid: false,
      rateLimited: true,
      error: data.error || 'Too many attempts. Try again later.',
    };
  }
  if (!res.ok) {
    return { valid: false, error: data.error || `Validation failed (${res.status})` };
  }
  return {
    valid: !!data.valid,
    message: data.message,
    error: data.error,
  };
}

/**
 * Validate via background service worker (reliable host permission + fetch).
 * @param {string} apiOrigin
 * @param {string} apiKey
 * @returns {Promise<{ valid: boolean; message?: string; error?: string; rateLimited?: boolean }>}
 */
export function validateGeminiKeyViaBackground(apiOrigin, apiKey) {
  const messagePromise = new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'VALIDATE_GEMINI_KEY', apiOrigin, apiKey },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Extension messaging failed'));
          return;
        }
        if (!response || typeof response !== 'object') {
          reject(new Error('No response from background worker. Reload the extension.'));
          return;
        }
        if (response.ok === false) {
          resolve({
            valid: false,
            error: response.error || 'Validation failed',
            rateLimited: response.rateLimited,
          });
          return;
        }
        resolve({
          valid: !!response.valid,
          message: response.message,
          error: response.error,
          rateLimited: response.rateLimited,
        });
      },
    );
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          `Validation timed out (>${VALIDATE_GEMINI_KEY_BACKGROUND_TIMEOUT_MS / 1000}s).` +
            validationUnreachableHint(apiOrigin),
        ),
      );
    }, VALIDATE_GEMINI_KEY_BACKGROUND_TIMEOUT_MS);
  });

  return Promise.race([messagePromise, timeoutPromise]);
}
