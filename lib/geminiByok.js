import { DEFAULT_RAG_PROVIDER } from './ragProviders.js';
import { normalizeGeminiApiKey } from './validateGeminiClient.js';

/** Full V28 provider (non-RAG). */
export const NON_RAG_V28_PROVIDER = 'NextDoor-prompt-production-28';

/** Max wait for validate API (Universal may probe Gemini + model fallbacks). */
export const VALIDATE_GEMINI_KEY_TIMEOUT_MS = 55_000;

/** Background path only; keep slightly above fetch timeout. */
export const VALIDATE_GEMINI_KEY_BACKGROUND_TIMEOUT_MS = 60_000;

/** Quick POST to /api/providers before a full key probe. */
export const VALIDATE_GEMINI_KEY_PROBE_TIMEOUT_MS = 12_000;

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
/** Saved Gemini key in extension storage (regardless of toggle). */
export function hasSavedGeminiKey(settings) {
  const key = normalizeGeminiApiKey(settings?.geminiApiKey || '');
  return key.length >= 30;
}

/** Last four characters of a normalized key for display (never log full key). */
export function geminiKeyLastFour(rawKey) {
  const key = normalizeGeminiApiKey(rawKey || '');
  if (key.length < 4) return '';
  return key.slice(-4);
}

/**
 * @param {string | null | undefined} rawKey
 * @returns {string} e.g. "…abcd" or ""
 */
export function formatGeminiKeySuffixLabel(rawKey) {
  const tail = geminiKeyLastFour(rawKey);
  return tail ? `…${tail}` : '';
}

/** Key saved in Options and “use my key” is on (side panel badge). */
export function isByokConfigured(settings) {
  if (!settings?.geminiByokEnabled) return false;
  return hasSavedGeminiKey(settings);
}

/** Key is sent on moderate (RAG and non-RAG) when BYOK is enabled. */
export function isByokActiveForProvider(settings) {
  return isByokConfigured(settings);
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
  if (!isByokConfigured(settings)) return null;
  const key = normalizeGeminiApiKey(settings.geminiApiKey || '');
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
  return ' Use Options → Grant host permission for this origin, reload the extension on chrome://extensions if the service worker had errors, then try again.';
}

/**
 * Fast check that the API responds (empty key → immediate 200 JSON error).
 * @param {string} apiOrigin
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function probeProvidersApiReachable(apiOrigin) {
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/providers`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validateGeminiKey', apiKey: '' }),
      signal: AbortSignal.timeout(VALIDATE_GEMINI_KEY_PROBE_TIMEOUT_MS),
    });
    const text = await res.text();
    try {
      JSON.parse(text);
    } catch {
      return { ok: false, error: `API returned non-JSON (${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return {
        ok: false,
        error: `Could not reach ${origin} within ${VALIDATE_GEMINI_KEY_PROBE_TIMEOUT_MS / 1000}s.${validationUnreachableHint(origin)}`,
      };
    }
    return {
      ok: false,
      error: `Could not reach ${origin}.${validationUnreachableHint(origin)}`,
    };
  }
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
        error:
          `Validation timed out after ${VALIDATE_GEMINI_KEY_TIMEOUT_MS / 1000}s calling ${origin}.` +
          ' The server may still be testing your key with Google — try again.' +
          validationUnreachableHint(origin),
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
