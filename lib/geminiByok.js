import { DEFAULT_RAG_PROVIDER } from './ragProviders.js';
import { isGeminiQuotaOrBillingIssue } from './moderationResult.js';
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

/**
 * Saved personal key must be sent on every moderation (no shared pool while key exists).
 * @param {{ geminiApiKey?: string }} settings
 */
export function mustUseSavedGeminiKey(settings) {
  return hasSavedGeminiKey(settings);
}

/** Personal key is active for moderations when a key is saved (legacy toggle ignored). */
export function isByokConfigured(settings) {
  return mustUseSavedGeminiKey(settings);
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
  if (!mustUseSavedGeminiKey(settings)) return null;
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

/** Moderations without a working personal key use the service shared Gemini pool. */
export const SHARED_POOL_SHORT = 'shared pool';

/**
 * @param {{ geminiByokEnabled?: boolean; geminiApiKey?: string }} settings
 * @returns {boolean}
 */
export function shouldClearByokWithoutKey(settings) {
  return !!settings?.geminiByokEnabled && !hasSavedGeminiKey(settings);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isLikelyGeminiKeyAuthFailure(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  if (isGeminiQuotaOrBillingIssue(t)) return false;
  return (
    /api key|invalid key|key invalid|permission denied|unauthenticated|unauthorized/.test(t) ||
    /\b401\b|\b403\b/.test(t) ||
    /invalid[_\s-]?argument.*key|api key not valid|incorrect api key/.test(t)
  );
}

/** Must match {@link SHARED_POOL_MODERATION_LIMIT} in sharedPoolQuota.js (avoid import cycle). */
const SHARED_POOL_MODERATION_LIMIT_COPY = 5;

/**
 * @param {number | null | undefined} [remaining] — omit for generic copy without a live count
 */
export function sharedPoolActiveStatusMessage(remaining) {
  const limit = SHARED_POOL_MODERATION_LIMIT_COPY;
  let quotaLine;
  if (remaining === null || remaining === undefined) {
    quotaLine = `Up to ${limit} shared moderations.`;
  } else {
    const left = Math.max(0, Math.min(limit, Math.floor(Number(remaining) || 0)));
    quotaLine =
      left === 0
        ? `Shared pool: no free moderations left (${limit} used).`
        : `Shared pool: ${left} of ${limit} moderations left.`;
  }
  return (
    `${quotaLine} Save your own Gemini key in Options for uninterrupted moderating.`
  );
}

/** Side panel BYOK badge when no key is saved (quota shown elsewhere, not on the pill). */
export function sharedPoolByokOffBadgeLabel() {
  return 'Your key · Off';
}

/** @returns {string} */
export function sharedPoolByokOffBadgeTitle() {
  return noSavedGeminiKeyBadgeTitle();
}

/**
 * Side panel: prefer shared-pool guidance instead of opaque errors when no personal key is saved.
 * @param {string} message
 * @returns {boolean}
 */
export function shouldShowSharedPoolStatusForModerationError(message) {
  const m = String(message || '').toLowerCase();
  return (
    /borrowed key|moderation_limit|no api key available/.test(m) ||
    (/invalid api key/.test(m) && !/generativelanguage/.test(m))
  );
}

/**
 * @param {unknown} result
 * @returns {boolean}
 */
export function isSharedPoolModerationFailureResult(result) {
  if (!result || typeof result !== 'object') return false;
  const reason = String(/** @type {Record<string, unknown>} */ (result).reason || '').toLowerCase();
  if (!reason) return false;
  return (
    /borrowed key|moderation_limit|no api key available/.test(reason) ||
    reason.includes('api_key_invalid')
  );
}

/** Side panel badge tooltip when no key is saved. */
export function noSavedGeminiKeyBadgeTitle() {
  return (
    'Shared pool — no saved Gemini key. Click to add your key in Options (Save key uses your Google quota).'
  );
}

export function sharedPoolStillWorksSuffix() {
  return ` Moderations still work with the ${SHARED_POOL_SHORT}.`;
}

export function geminiKeyAuthFailureStatusMessage() {
  return (
    'Your Gemini key was rejected. Check the key in Google AI Studio, then Options → Save key again, ' +
    'or Remove key to use the shared pool.'
  );
}

/** @deprecated Use geminiKeyAuthFailureStatusMessage — shared-pool fallback removed when key saved. */
export function switchedToSharedPoolStatusMessage() {
  return geminiKeyAuthFailureStatusMessage();
}

export function byokQuotaWithSharedPoolHint() {
  return (
    'Gemini quota or billing issue on your key. Manage limits in Google AI Studio, or Remove key in ' +
    'Options to use the shared pool.'
  );
}

/**
 * @param {{ geminiApiKey?: string }} settings
 * @returns {boolean}
 */
export function isUsingSharedPoolForModeration(settings) {
  return !mustUseSavedGeminiKey(settings);
}
