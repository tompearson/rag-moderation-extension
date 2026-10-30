import { hostPermissionForOrigin } from './envProfiles.js';

/**
 * @param {string} apiOrigin
 * @returns {Promise<boolean>}
 */
export async function ensureHostPermission(apiOrigin) {
  const pattern = hostPermissionForOrigin(apiOrigin);
  if (!pattern) return false;

  const has = await chrome.permissions.contains({ origins: [pattern] });
  if (has) return true;

  return chrome.permissions.request({ origins: [pattern] });
}
