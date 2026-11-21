import { hasSavedGeminiKey } from './geminiByok.js';

/** Once per install (shared pool, no saved key): offered Auto Nav + Auto Moderate disable dialog. */
export const AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY = 'autoBehaviorsTrialOfferSeen';

/**
 * @param {Awaited<ReturnType<typeof import('./userSettings.js').loadSettings>>} settings
 * @param {boolean} seen
 * @returns {boolean}
 */
export function shouldShowAutoBehaviorsTrialOffer(settings, seen) {
  if (seen) return false;
  if (hasSavedGeminiKey(settings)) return false;
  if (!settings.autoNavEnabled && !settings.autoModerateEnabled) return false;
  return true;
}

/** @returns {Promise<boolean>} */
export async function getAutoBehaviorsTrialOfferSeen() {
  const stored = await chrome.storage.local.get(AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY);
  return stored[AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY] === true;
}

/** @returns {Promise<void>} */
export async function markAutoBehaviorsTrialOfferSeen() {
  await chrome.storage.local.set({ [AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY]: true });
}