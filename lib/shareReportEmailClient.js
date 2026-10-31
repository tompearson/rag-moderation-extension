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
 * @param {{ moderationId: string; email: string }} params
 * @returns {Promise<{ emailSent: boolean; emailedTo: string | null; requestedEmail: string }>}
 */
export async function postShareReportEmail(apiOrigin, params) {
  const requestedEmail = String(params.email || '').trim();
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/get-reports?action=shareReportEmail`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moderationId: params.moderationId,
      email: requestedEmail,
      layout: 'email',
    }),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const detail = messageFromResponseBody(parsed) || formatHttpError(res, text);
    const errCode =
      parsed && typeof parsed === 'object'
        ? String(/** @type {Record<string, unknown>} */ (parsed).error || '')
        : '';
    if (errCode === 'email_required') {
      throw new Error('A valid email address is required to share this report.');
    }
    if (errCode === 'forbidden_target') {
      throw new Error('That report cannot be shared from here.');
    }
    if (/rate/i.test(detail)) {
      throw new Error(detail);
    }
    throw new Error(detail);
  }
  if (parsed && typeof parsed === 'object' && /** @type {Record<string, unknown>} */ (parsed).success === false) {
    throw new Error(messageFromResponseBody(parsed) || 'Could not email report.');
  }

  const data =
    parsed && typeof parsed === 'object' ? /** @type {Record<string, unknown>} */ (parsed) : {};
  const emailedTo =
    typeof data.emailedTo === 'string' && data.emailedTo.trim() ? data.emailedTo.trim() : null;

  return {
    emailSent: data.emailSent !== false,
    emailedTo,
    requestedEmail,
  };
}
