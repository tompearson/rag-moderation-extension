/**
 * Moderator-facing readiness for extension BYOK validate (mirrors Universal server/client).
 */

export const GEMINI_KEY_READINESS = {
  READY: 'ready',
  READY_WITH_LIMITS: 'ready_with_limits',
  READY_STANDARD_ONLY: 'ready_standard_only',
  INVALID: 'invalid',
};

/**
 * @param {boolean} ragProviderSelected
 * @param {boolean} advancedRagCheckEnabled
 */
export function shouldRunRagStyleProbes(ragProviderSelected, advancedRagCheckEnabled) {
  return ragProviderSelected === true || advancedRagCheckEnabled === true;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {{ readiness: string; summary: string; details: string[] }}
 */
export function buildGeminiKeyReadiness(payload) {
  if (payload.valid !== true) {
    const err = String(payload.error || payload.message || 'Google rejected this key. Check AI Studio and try again.');
    return {
      readiness: GEMINI_KEY_READINESS.INVALID,
      summary: err.startsWith('API key test failed:')
        ? err.replace(/^API key test failed:\s*/, 'Google rejected this key: ')
        : err,
      details: [],
    };
  }

  const details = Array.isArray(payload.details)
    ? payload.details.map(String)
    : Array.isArray(payload.ragWarnings)
      ? payload.ragWarnings.map(String)
      : [];

  const quotaWarning = payload.quotaWarning === true;
  const ragChecked = payload.ragStyleChecked === true;
  const ragQuota = payload.ragHasQuotaLimit === true;
  const ragAllOk = payload.ragAllOk === true;

  if (quotaWarning || ragQuota) {
    return {
      readiness: GEMINI_KEY_READINESS.READY_WITH_LIMITS,
      summary:
        'Your key is valid. Google free tier may be used up for now — try again after midnight Pacific or check billing in AI Studio.',
      details: quotaWarning && payload.warning ? [String(payload.warning), ...details] : details,
    };
  }

  if (ragChecked && ragAllOk) {
    return {
      readiness: GEMINI_KEY_READINESS.READY,
      summary: 'Your key works for moderations, including RAG search and AI.',
      details,
    };
  }

  if (ragChecked && details.length > 0) {
    return {
      readiness: GEMINI_KEY_READINESS.READY_WITH_LIMITS,
      summary: 'Your key is valid. Some RAG checks reported limits — see details.',
      details,
    };
  }

  if (ragChecked) {
    return {
      readiness: GEMINI_KEY_READINESS.READY,
      summary: 'Your key works for moderations, including RAG search and AI.',
      details,
    };
  }

  return {
    readiness: GEMINI_KEY_READINESS.READY,
    summary: 'Your key works for moderations.',
    details,
  };
}

/**
 * @param {Record<string, unknown>} payload
 */
export function attachGeminiKeyReadiness(payload) {
  const { readiness, summary, details } = buildGeminiKeyReadiness(payload);
  const message = payload.message || [summary, ...details].filter(Boolean).join(' ');
  return { ...payload, readiness, summary, details, message };
}

/**
 * @param {unknown} payload
 */
export function computeReadinessFromValidateResult(payload) {
  if (payload == null || typeof payload !== 'object') {
    return {
      readiness: GEMINI_KEY_READINESS.INVALID,
      summary: 'Key validation failed.',
      details: [],
    };
  }
  const obj = /** @type {Record<string, unknown>} */ (payload);
  if (obj.valid !== true) {
    return buildGeminiKeyReadiness(obj);
  }
  if (typeof obj.summary === 'string' && obj.summary.trim()) {
    return {
      readiness: typeof obj.readiness === 'string' ? obj.readiness : GEMINI_KEY_READINESS.READY,
      summary: obj.summary.trim(),
      details: Array.isArray(obj.details) ? obj.details.map(String) : [],
    };
  }
  return buildGeminiKeyReadiness(obj);
}
