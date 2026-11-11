import { formatHttpError } from './moderateClient.js';
import { getExtensionVersion } from './extensionVersion.js';
import {
  GET_LATEST_EXTENSION_GUIDE_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
} from './geminiKeyUserHelp.js';
import { isStoreBuild } from './buildConfig.js';

export const INVITE_PERSONAL_MESSAGE_MAX = 300;

/**
 * @returns {string}
 */
export function resolveInstallGuideUrlForInvite() {
  return isStoreBuild() ? INSTALL_CHROME_EXTENSION_GUIDE_URL : GET_LATEST_EXTENSION_GUIDE_URL;
}

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
 * @param {{
 *   friendEmail: string;
 *   personalMessage?: string;
 *   installGuideUrl?: string;
 *   extensionVersion?: string;
 * }} params
 * @returns {Promise<{ success: boolean; message?: string; messageId?: string | null }>}
 */
export async function postExtensionInviteFriend(apiOrigin, params) {
  const friendEmail = String(params.friendEmail || '').trim();
  const personalRaw = String(params.personalMessage ?? '').trim();
  const personalMessage = personalRaw.slice(0, INVITE_PERSONAL_MESSAGE_MAX);
  const origin = apiOrigin.replace(/\/+$/, '');
  const url = `${origin}/api/extension-invite`;
  const extVer =
    params.extensionVersion != null && String(params.extensionVersion).trim()
      ? String(params.extensionVersion).trim()
      : getExtensionVersion() || '';
  const installGuideUrl = params.installGuideUrl?.trim() || resolveInstallGuideUrlForInvite();

  const body = {
    friendEmail,
    installGuideUrl,
    ...(personalMessage ? { personalMessage } : {}),
    ...(extVer ? { extensionVersion: extVer } : {}),
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
      throw new Error(detail || 'Too many invites. Try again later.');
    }
    if (res.status === 503) {
      throw new Error(detail || 'Invite delivery is unavailable right now.');
    }
    throw new Error(detail);
  }
  if (parsed && typeof parsed === 'object' && /** @type {Record<string, unknown>} */ (parsed).success === false) {
    throw new Error(messageFromResponseBody(parsed) || 'Could not send invite.');
  }
  const o = /** @type {{ success?: boolean; message?: string; messageId?: string | null }} */ (
    parsed && typeof parsed === 'object' ? parsed : {}
  );
  return {
    success: o.success !== false,
    message: typeof o.message === 'string' ? o.message : 'Invite sent.',
    messageId: o.messageId ?? null,
  };
}
