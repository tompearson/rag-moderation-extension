/** @typedef {'local' | 'production' | 'custom'} EnvProfileId */

export const DEFAULT_PROFILE_ID = /** @type {EnvProfileId} */ ('production');

export { DEFAULT_RAG_PROVIDER } from './ragProviders.js';

/** @type {Record<EnvProfileId, { label: string; apiOrigin: string }>} */
export const ENV_PROFILES = {
  local: {
    label: 'Local dev',
    apiOrigin: 'http://127.0.0.1:3001',
  },
  production: {
    label: 'Production',
    apiOrigin: 'https://www.airesearchdog.net',
  },
  custom: {
    label: 'Custom',
    apiOrigin: '',
  },
};

/**
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function normalizeApiOrigin(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * @param {EnvProfileId} profileId
 * @param {string | null | undefined} customOrigin
 * @param {{ devLocalFallback?: boolean }} [opts]
 * @returns {{ profileId: EnvProfileId; label: string; apiOrigin: string | null; moderateUrl: string | null }}
 */
export function resolveApiConfig(profileId, customOrigin, opts = {}) {
  const { devLocalFallback = false } = opts;
  let id = profileId in ENV_PROFILES ? profileId : DEFAULT_PROFILE_ID;
  let profile = ENV_PROFILES[id];
  let apiOrigin = profile.apiOrigin;
  if (id === 'custom') {
    const customNorm = normalizeApiOrigin(customOrigin);
    if (customNorm) {
      apiOrigin = customNorm;
    } else if (devLocalFallback) {
      id = 'local';
      profile = ENV_PROFILES.local;
      apiOrigin = profile.apiOrigin;
    } else {
      apiOrigin = '';
    }
  }
  const normalized = normalizeApiOrigin(apiOrigin);
  return {
    profileId: id,
    label: profile.label,
    apiOrigin: normalized,
    moderateUrl: normalized ? `${normalized}/api/moderate` : null,
  };
}

/**
 * @param {{ envProfileId?: EnvProfileId; customApiOrigin?: string }} settings
 * @param {boolean} storeBuild
 */
export function resolveSettingsApiConfig(settings, storeBuild) {
  return resolveApiConfig(settings.envProfileId, settings.customApiOrigin, {
    devLocalFallback: !storeBuild,
  });
}

/**
 * @param {{ envProfileId?: EnvProfileId }} settings
 * @returns {string}
 */
export function apiOriginConfigurationErrorMessage(settings) {
  if (settings.envProfileId === 'custom') {
    return (
      'Custom API origin is missing or invalid. Open Options → Advanced → Profile, ' +
      'enter the server URL (for example http://127.0.0.1:3001), or choose Local dev or Production.'
    );
  }
  return (
    'Moderation API URL is not configured. Open Options → Advanced → Profile and choose Local dev or Production.'
  );
}

/**
 * Host permission pattern for chrome.permissions (origin + /*).
 * @param {string} apiOrigin
 * @returns {string | null}
 */
export function hostPermissionForOrigin(apiOrigin) {
  const normalized = normalizeApiOrigin(apiOrigin);
  if (!normalized) return null;
  return `${normalized}/*`;
}

/**
 * User-facing profile name (no hostname) for side panel / Options.
 * @param {{ profileId?: EnvProfileId; label?: string; apiOrigin?: string | null }} api
 * @returns {string}
 */
export function formatApiProfileUiLabel(api) {
  const id = api.profileId;
  if (id === 'custom') {
    return api.apiOrigin ? 'Custom' : 'Custom (set URL in Options)';
  }
  return api.label || 'Production';
}
