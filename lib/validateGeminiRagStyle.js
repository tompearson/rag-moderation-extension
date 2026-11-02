/**
 * Optional RAG-aligned probes (first-rag-system): embed + flash-lite chat.
 * Does not call Render; predicts free-tier headroom on embed vs chat meters.
 */

import { GEMINI_GENERATIVE_ORIGIN } from './geminiApiOrigin.js';
import {
  VALIDATE_GEMINI_CLIENT_TIMEOUT_MS,
  normalizeGeminiApiKey,
  validateGeminiKeyClient,
} from './validateGeminiClient.js';
import {
  RAG_EMBEDDING_MODEL_IDS,
  RAG_MODERATION_MODEL,
  RAG_MODERATION_FALLBACK_MODEL,
} from './geminiRagModels.js';

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
export function looksLikeInvalidGeminiKey(message) {
  const m = message.toLowerCase();
  return (
    m.includes('api key not valid') ||
    m.includes('api_key_invalid') ||
    m.includes('invalid api key') ||
    (m.includes('permission denied') && m.includes('api key'))
  );
}

/**
 * @param {string} message
 * @param {number} status
 * @returns {boolean}
 */
export function looksLikeGeminiQuotaOrRateLimit(message, status) {
  if (status === 429) return true;
  const m = String(message || '').toLowerCase();
  return (
    /resource_exhausted|free_tier|quota exceeded|rate limit|too many requests/.test(m)
  );
}

/**
 * @typedef {'ok' | 'quota' | 'invalid' | 'error' | 'not_found'} ProbeOutcome
 */

/**
 * @param {string} apiKey
 * @param {string} modelId
 * @param {Record<string, unknown>} body
 * @param {':generateContent' | ':embedContent'} method
 * @returns {Promise<{ outcome: ProbeOutcome; detail?: string }>}
 */
async function probeModel(apiKey, modelId, body, method) {
  const pathModel = encodeURIComponent(modelId.replace(/^models\//, ''));
  const url = `${GEMINI_GENERATIVE_ORIGIN}/v1beta/models/${pathModel}${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(VALIDATE_GEMINI_CLIENT_TIMEOUT_MS),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (res.ok) return { outcome: 'ok' };
    const errMsg = formatGoogleError(data, res.status);
    if (looksLikeInvalidGeminiKey(errMsg)) return { outcome: 'invalid', detail: errMsg };
    if (looksLikeGeminiQuotaOrRateLimit(errMsg, res.status)) {
      return { outcome: 'quota', detail: errMsg };
    }
    if (res.status === 404) return { outcome: 'not_found', detail: errMsg };
    return { outcome: 'error', detail: errMsg };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { outcome: 'error', detail: 'Request timed out' };
    }
    return { outcome: 'error', detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * @param {string} rawKey
 * @returns {Promise<{ keyInvalid: boolean; error?: string; warnings: string[]; message?: string }>}
 */
export async function validateGeminiKeyRagStyleProbes(rawKey) {
  const apiKey = normalizeGeminiApiKey(rawKey);
  const warnings = [];

  /** @type {ProbeOutcome} */
  let embedOutcome = 'not_found';
  let embedDetail = '';
  for (const modelId of RAG_EMBEDDING_MODEL_IDS) {
    const probe = await probeModel(
      apiKey,
      modelId,
      { content: { parts: [{ text: 'RAG embed probe' }] } },
      ':embedContent',
    );
    if (probe.outcome === 'not_found') continue;
    embedOutcome = probe.outcome;
    embedDetail = probe.detail || '';
    break;
  }
  if (embedOutcome === 'not_found') {
    embedOutcome = 'error';
    embedDetail = 'Embedding model not found';
  }

  /** @type {ProbeOutcome} */
  let chatOutcome = 'not_found';
  let chatDetail = '';
  let chatModelUsed = '';
  for (const modelId of [RAG_MODERATION_MODEL, RAG_MODERATION_FALLBACK_MODEL]) {
    const probe = await probeModel(
      apiKey,
      modelId,
      {
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0 },
      },
      ':generateContent',
    );
    if (probe.outcome === 'not_found') continue;
    chatOutcome = probe.outcome;
    chatDetail = probe.detail || '';
    chatModelUsed = modelId;
    if (probe.outcome === 'ok') break;
    if (probe.outcome === 'invalid') break;
    if (probe.outcome === 'quota') break;
  }
  if (chatOutcome === 'not_found') {
    chatOutcome = 'error';
    chatDetail = 'Chat model not found';
  }

  if (embedOutcome === 'invalid' && chatOutcome === 'invalid') {
    return {
      keyInvalid: true,
      warnings: [],
      error: `RAG-style: key rejected for embed and chat. ${embedDetail || chatDetail}`,
    };
  }
  if (embedOutcome === 'invalid') {
    return { keyInvalid: true, warnings: [], error: `RAG-style embed failed: ${embedDetail}` };
  }
  if (chatOutcome === 'invalid') {
    return { keyInvalid: true, warnings: [], error: `RAG-style chat failed: ${chatDetail}` };
  }

  if (embedOutcome === 'ok') {
    warnings.push(`RAG embed OK (${RAG_EMBEDDING_MODEL_IDS[0]}).`);
  } else if (embedOutcome === 'quota') {
    warnings.push(
      'RAG embed: free-tier quota exhausted (429) — key accepted; reset ~midnight Pacific or check billing.',
    );
  } else {
    warnings.push(`RAG embed: ${embedDetail || embedOutcome}.`);
  }

  if (chatOutcome === 'ok') {
    warnings.push(`RAG chat OK (${chatModelUsed}).`);
  } else if (chatOutcome === 'quota') {
    warnings.push(
      `RAG chat (${chatModelUsed || RAG_MODERATION_MODEL}): free-tier quota exhausted — key accepted.`,
    );
  } else {
    warnings.push(`RAG chat: ${chatDetail || chatOutcome}.`);
  }

  const ragOk = embedOutcome === 'ok' && chatOutcome === 'ok';
  const message = ragOk
    ? 'RAG-style probes OK (embed + flash-lite path). Same meters used when BYOK is on for RAG moderations.'
    : 'RAG-style probes finished (see notes). When BYOK is on, RAG moderations use your key for embed + chat.';

  return { keyInvalid: false, warnings, message };
}

/**
 * Standard generate probe, then optional RAG embed + flash-lite probes.
 * @param {string} rawKey
 * @param {{ ragStyle?: boolean }} [options]
 */
export async function validateGeminiKeyForOptions(rawKey, options = {}) {
  const basic = await validateGeminiKeyClient(rawKey);
  if (!basic.valid) return basic;
  if (!options.ragStyle) return basic;

  const rag = await validateGeminiKeyRagStyleProbes(rawKey);
  if (rag.keyInvalid) {
    return { valid: false, error: rag.error || 'RAG-style validation failed.' };
  }

  const message = [basic.message, rag.message, ...(rag.warnings || [])].filter(Boolean).join(' ');
  return { valid: true, message, ragStyleChecked: true };
}
