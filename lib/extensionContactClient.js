import { formatHttpError } from './moderateClient.js';
import { getExtensionVersion } from './extensionVersion.js';

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
 * @param {{ message: string; replyEmail?: string; subject?: string; extensionVersion?: string }} params
 * @returns {Promise<{ success: boolean; message?: string; messageId?: string | null }>}
 */
export async function postExtensionContact(apiOrigin, params) {
  const message = String(params.message || '').trim();
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/extension-contact`;
  const extVer =
    params.extensionVersion != null && String(params.extensionVersion).trim()
      ? String(params.extensionVersion).trim()
      : getExtensionVersion() || '';
  const body = {
    message,
    ...(extVer ? { extensionVersion: extVer } : {}),
    ...(params.replyEmail != null && String(params.replyEmail).trim()
      ? { replyEmail: String(params.replyEmail).trim() }
      : {}),
    ...(params.subject != null && String(params.subject).trim()
      ? { subject: String(params.subject).trim() }
      : {}),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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
    if (res.status === 429) {
      throw new Error(detail || 'Too many messages. Try again later.');
    }
    if (res.status === 503) {
      throw new Error(detail || 'Contact is unavailable right now.');
    }
    throw new Error(detail);
  }
  if (parsed && typeof parsed === 'object' && /** @type {Record<string, unknown>} */ (parsed).success === false) {
    throw new Error(messageFromResponseBody(parsed) || 'Could not send message.');
  }
  const o = /** @type {{ success?: boolean; message?: string; messageId?: string | null }} */ (
    parsed && typeof parsed === 'object' ? parsed : {}
  );
  return {
    success: o.success !== false,
    message: typeof o.message === 'string' ? o.message : 'Message sent.',
    messageId: o.messageId ?? null,
  };
}
