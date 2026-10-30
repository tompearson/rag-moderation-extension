/** @typedef {'local' | 'production' | 'custom'} EnvProfileId */

export const DEFAULT_PROFILE_ID = /** @type {EnvProfileId} */ ('local');

export const DEFAULT_RAG_PROVIDER = 'NextDoor-prompt-production-28-rag';

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
 * @returns {{ profileId: EnvProfileId; label: string; apiOrigin: string | null; moderateUrl: string | null }}
 */
export function resolveApiConfig(profileId, customOrigin) {
  const id = profileId in ENV_PROFILES ? profileId : DEFAULT_PROFILE_ID;
  const profile = ENV_PROFILES[id];
  let apiOrigin = profile.apiOrigin;
  if (id === 'custom') {
    apiOrigin = normalizeApiOrigin(customOrigin) || '';
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
 * Host permission pattern for chrome.permissions (origin + /*).
 * @param {string} apiOrigin
 * @returns {string | null}
 */
export function hostPermissionForOrigin(apiOrigin) {
  const normalized = normalizeApiOrigin(apiOrigin);
  if (!normalized) return null;
  return `${normalized}/*`;
}
