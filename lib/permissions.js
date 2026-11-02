import { hostPermissionForOrigin } from './envProfiles.js';
import { GEMINI_GENERATIVE_ORIGIN } from './geminiApiOrigin.js';

/** Host permission pattern for direct Gemini key validation. */
export function hostPermissionForGeminiApi() {
  return `${GEMINI_GENERATIVE_ORIGIN}/*`;
}

/**
 * @param {string} apiOrigin
 * @returns {Promise<boolean>}
 */
export async function isApiOriginHostGranted(apiOrigin) {
  const pattern = hostPermissionForOrigin(apiOrigin);
  if (!pattern) return false;
  return chrome.permissions.contains({ origins: [pattern] });
}

/**
 * Request optional host permission. Must run in a user-gesture handler (side panel / options), not the service worker.
 * @param {string} apiOrigin
 * @returns {Promise<boolean>}
 */
export async function ensureHostPermission(apiOrigin) {
  const pattern = hostPermissionForOrigin(apiOrigin);
  if (!pattern) return false;

  if (await isApiOriginHostGranted(apiOrigin)) return true;

  return chrome.permissions.request({ origins: [pattern] });
}

/** Request optional host access for generativelanguage.googleapis.com (BYOK Test & save). */
export async function ensureGeminiApiPermission() {
  const pattern = hostPermissionForGeminiApi();
  if (await chrome.permissions.contains({ origins: [pattern] })) return true;
  return chrome.permissions.request({ origins: [pattern] });
}

/** Remove optional host permissions the user previously granted (factory reset). */
export async function revokeGrantedHostPermissions() {
  const all = await chrome.permissions.getAll();
  const origins = all.origins?.filter(Boolean) ?? [];
  if (!origins.length) return;
  await chrome.permissions.remove({ origins });
}
