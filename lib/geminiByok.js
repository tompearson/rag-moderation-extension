import { DEFAULT_RAG_PROVIDER } from './ragProviders.js';

/** Full V28 provider (non-RAG) — BYOK applies here in phase 1. */
export const NON_RAG_V28_PROVIDER = 'NextDoor-prompt-production-28';

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
export async function validateGeminiKey(apiOrigin, apiKey) {
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/providers`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'validateGeminiKey', apiKey }),
  });
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
