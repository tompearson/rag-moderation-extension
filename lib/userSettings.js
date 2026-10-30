export const DEFAULT_USER_LOCATION = 'Oregon';

export const STORAGE_KEYS = {
  userLocation: 'userLocation',
  locationOnboardingComplete: 'locationOnboardingComplete',
  envProfileId: 'envProfileId',
  customApiOrigin: 'customApiOrigin',
  moderatorId: 'moderatorId',
  deviceId: 'deviceId',
  ragProvider: 'ragProvider',
};

const DEFAULT_MODERATOR_ID = 'chrome-ext-dev';
const DEFAULT_DEVICE_ID = 'chrome-ext@local';

/**
 * @returns {Promise<{
 *   userLocation: string | null;
 *   locationOnboardingComplete: boolean;
 *   envProfileId: import('./envProfiles.js').EnvProfileId;
 *   customApiOrigin: string;
 *   moderatorId: string;
 *   deviceId: string;
 *   ragProvider: string;
 * }>}
 */
export async function loadSettings() {
  const defaults = {
    [STORAGE_KEYS.userLocation]: null,
    [STORAGE_KEYS.locationOnboardingComplete]: false,
    [STORAGE_KEYS.envProfileId]: 'local',
    [STORAGE_KEYS.customApiOrigin]: '',
    [STORAGE_KEYS.moderatorId]: DEFAULT_MODERATOR_ID,
    [STORAGE_KEYS.deviceId]: DEFAULT_DEVICE_ID,
    [STORAGE_KEYS.ragProvider]: 'NextDoor-prompt-production-28-rag',
  };
  const stored = await chrome.storage.local.get(defaults);
  return {
    userLocation: stored.userLocation,
    locationOnboardingComplete: !!stored.locationOnboardingComplete,
    envProfileId: /** @type {import('./envProfiles.js').EnvProfileId} */ (
      stored.envProfileId in { local: 1, production: 1, custom: 1 }
        ? stored.envProfileId
        : 'local'
    ),
    customApiOrigin: stored.customApiOrigin || '',
    moderatorId: stored.moderatorId || DEFAULT_MODERATOR_ID,
    deviceId: stored.deviceId || DEFAULT_DEVICE_ID,
    ragProvider: stored.ragProvider || 'NextDoor-prompt-production-28-rag',
  };
}

/**
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function hasValidUserLocation(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {string} userLocation
 * @param {{ onboarding?: boolean }} [opts]
 */
export async function saveUserLocation(userLocation, opts = {}) {
  const trimmed = userLocation.trim();
  if (!trimmed) throw new Error('Location cannot be empty');
  const payload = { [STORAGE_KEYS.userLocation]: trimmed };
  if (opts.onboarding) {
    payload[STORAGE_KEYS.locationOnboardingComplete] = true;
  }
  await chrome.storage.local.set(payload);
}

/** Reset location onboarding (shows modal again). */
export async function resetUserLocation() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.userLocation]: null,
    [STORAGE_KEYS.locationOnboardingComplete]: false,
  });
}

/**
 * @param {Partial<Awaited<ReturnType<typeof loadSettings>>>} patch
 */
export async function saveSettingsPatch(patch) {
  /** @type {Record<string, unknown>} */
  const payload = {};
  if (patch.envProfileId !== undefined) payload[STORAGE_KEYS.envProfileId] = patch.envProfileId;
  if (patch.customApiOrigin !== undefined) payload[STORAGE_KEYS.customApiOrigin] = patch.customApiOrigin;
  if (patch.moderatorId !== undefined) payload[STORAGE_KEYS.moderatorId] = patch.moderatorId;
  if (patch.deviceId !== undefined) payload[STORAGE_KEYS.deviceId] = patch.deviceId;
  if (patch.ragProvider !== undefined) payload[STORAGE_KEYS.ragProvider] = patch.ragProvider;
  if (patch.userLocation !== undefined && hasValidUserLocation(patch.userLocation)) {
    payload[STORAGE_KEYS.userLocation] = patch.userLocation.trim();
  }
  if (Object.keys(payload).length) await chrome.storage.local.set(payload);
}
