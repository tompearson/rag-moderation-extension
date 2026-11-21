import assert from 'node:assert/strict';
import {
  shouldShowAutoBehaviorsTrialOffer,
  AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY,
} from '../lib/autoBehaviorsTrialOffer.js';

const base = { autoNavEnabled: true, autoModerateEnabled: true, geminiApiKey: '' };

assert.equal(shouldShowAutoBehaviorsTrialOffer(base, false), true);
assert.equal(shouldShowAutoBehaviorsTrialOffer(base, true), false);
assert.equal(
  shouldShowAutoBehaviorsTrialOffer(
    { ...base, geminiApiKey: 'A'.repeat(30) },
    false,
  ),
  false,
);
assert.equal(
  shouldShowAutoBehaviorsTrialOffer(
    { autoNavEnabled: false, autoModerateEnabled: false, geminiApiKey: '' },
    false,
  ),
  false,
);
assert.equal(
  shouldShowAutoBehaviorsTrialOffer(
    { autoNavEnabled: true, autoModerateEnabled: false, geminiApiKey: '' },
    false,
  ),
  true,
);
assert.equal(AUTO_BEHAVIORS_TRIAL_OFFER_SEEN_KEY, 'autoBehaviorsTrialOfferSeen');

console.log('OK — auto behaviors trial offer tests passed');