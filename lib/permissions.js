import { hostPermissionForOrigin } from './envProfiles.js';

/**
 * @param {string} apiOrigin
 * @returns {Promise<boolean>}
 */
export async function hasHostPermission(apiOrigin) {
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

  if (await hasHostPermission(apiOrigin)) return true;

  return chrome.permissions.request({ origins: [pattern] });
}
