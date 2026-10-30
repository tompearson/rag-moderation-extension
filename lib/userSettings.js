import { DEFAULT_PROFILE_ID } from './envProfiles.js';
import { canonicalUsState, DEFAULT_USER_LOCATION } from './usStates.js';
import { DEFAULT_MODERATE_TIMEOUT_SEC, parseModerateTimeoutSec } from './moderationTimeout.js';

export { DEFAULT_USER_LOCATION };

export const STORAGE_KEYS = {
  userLocation: 'userLocation',
  locationOnboardingComplete: 'locationOnboardingComplete',
  envProfileId: 'envProfileId',
  customApiOrigin: 'customApiOrigin',
  moderatorId: 'moderatorId',
  deviceId: 'deviceId',
  ragProvider: 'ragProvider',
  moderateTimeoutSec: 'moderateTimeoutSec',
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
 *   moderateTimeoutSec: number;
 * }>}
 */
export async function loadSettings() {
  const defaults = {
    [STORAGE_KEYS.userLocation]: null,
    [STORAGE_KEYS.locationOnboardingComplete]: false,
    [STORAGE_KEYS.envProfileId]: DEFAULT_PROFILE_ID,
    [STORAGE_KEYS.customApiOrigin]: '',
    [STORAGE_KEYS.moderatorId]: DEFAULT_MODERATOR_ID,
    [STORAGE_KEYS.deviceId]: DEFAULT_DEVICE_ID,
    [STORAGE_KEYS.ragProvider]: 'NextDoor-prompt-production-28-rag',
    [STORAGE_KEYS.moderateTimeoutSec]: DEFAULT_MODERATE_TIMEOUT_SEC,
  };
  const stored = await chrome.storage.local.get(defaults);
  return {
    userLocation: stored.userLocation,
    locationOnboardingComplete: !!stored.locationOnboardingComplete,
    envProfileId: /** @type {import('./envProfiles.js').EnvProfileId} */ (
      stored.envProfileId in { local: 1, production: 1, custom: 1 }
        ? stored.envProfileId
        : DEFAULT_PROFILE_ID
    ),
    customApiOrigin: stored.customApiOrigin || '',
    moderatorId: stored.moderatorId || DEFAULT_MODERATOR_ID,
    deviceId: stored.deviceId || DEFAULT_DEVICE_ID,
    ragProvider: stored.ragProvider || 'NextDoor-prompt-production-28-rag',
    moderateTimeoutSec: parseModerateTimeoutSec(stored.moderateTimeoutSec),
  };
}

/**
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function hasValidUserLocation(value) {
  return canonicalUsState(value) !== null;
}

/**
 * Feed location was confirmed in the side panel modal or explicitly saved in Options.
 * @param {{ userLocation?: string | null; locationOnboardingComplete?: boolean }} settings
 */
export function isFeedLocationConfirmed(settings) {
  return !!settings.locationOnboardingComplete && hasValidUserLocation(settings.userLocation);
}

/**
 * @param {string} userLocation
 * @param {{ onboarding?: boolean }} [opts]
 */
export async function saveUserLocation(userLocation, opts = {}) {
  const canonical = canonicalUsState(userLocation);
  if (!canonical) throw new Error('Select a US state.');
  const payload = { [STORAGE_KEYS.userLocation]: canonical };
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

/** Wipe all keys in chrome.storage.local for this extension. */
export async function clearExtensionStorage() {
  await chrome.storage.local.clear();
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
  if (patch.moderateTimeoutSec !== undefined) {
    payload[STORAGE_KEYS.moderateTimeoutSec] = parseModerateTimeoutSec(patch.moderateTimeoutSec);
  }
  if (patch.userLocation !== undefined && hasValidUserLocation(patch.userLocation)) {
    payload[STORAGE_KEYS.userLocation] = canonicalUsState(patch.userLocation);
  }
  if (Object.keys(payload).length) await chrome.storage.local.set(payload);
}
