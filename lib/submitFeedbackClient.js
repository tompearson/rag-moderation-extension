import { formatHttpError } from './moderateClient.js';

/**
 * @param {unknown} data
 * @returns {string}
 */
function messageFromResponseBody(data) {
  if (!data || typeof data !== 'object') return '';
  const o = /** @type {Record<string, unknown>} */ (data);
  const msg = o.message ?? o.error;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  return '';
}

/**
 * @param {string} apiOrigin
 * @param {string} moderationId
 * @returns {Promise<{ exists: boolean; canSubmitAgain: boolean; rating: number | null }>}
 */
export async function fetchFeedbackExists(apiOrigin, moderationId) {
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/get-reports?action=feedbackExists&id=${encodeURIComponent(moderationId)}`;
  const res = await fetch(url);
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    throw new Error(messageFromResponseBody(parsed) || formatHttpError(res, text));
  }
  const data =
    parsed && typeof parsed === 'object' ? /** @type {Record<string, unknown>} */ (parsed) : {};
  return {
    exists: data.exists === true,
    canSubmitAgain: data.canSubmitAgain !== false,
    rating: typeof data.rating === 'number' ? data.rating : null,
  };
}

/**
 * @param {string} apiOrigin
 * @param {{
 *   moderationId: string;
 *   comment: string;
 *   feedbackSessionId: string;
 *   rating?: number;
 *   provider?: string | null;
 *   analysisType?: string | null;
 *   appVersion?: string | null;
 *   platform?: string | null;
 *   reporterEmail?: string | null;
 * }} params
 */
export async function postSubmitFeedback(apiOrigin, params) {
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/get-reports?action=submitFeedback`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moderationId: params.moderationId,
      rating: params.rating ?? -1,
      comment: params.comment,
      feedbackSessionId: params.feedbackSessionId,
      provider: params.provider ?? null,
      analysisType: params.analysisType ?? null,
      appVersion: params.appVersion ?? null,
      platform: params.platform ?? 'chrome-extension',
      ...(params.reporterEmail ? { reporterEmail: params.reporterEmail } : {}),
    }),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (res.status === 409) {
    const errCode =
      parsed && typeof parsed === 'object'
        ? String(/** @type {Record<string, unknown>} */ (parsed).error || '')
        : '';
    if (errCode === 'feedback_resubmit_blocked') {
      throw new Error(
        messageFromResponseBody(parsed) ||
          'Feedback already submitted. Add new Discuss messages on the full report to submit again.',
      );
    }
  }
  if (!res.ok) {
    throw new Error(messageFromResponseBody(parsed) || formatHttpError(res, text));
  }
  if (parsed && typeof parsed === 'object' && /** @type {Record<string, unknown>} */ (parsed).success === false) {
    throw new Error(messageFromResponseBody(parsed) || 'Could not submit feedback.');
  }
}
