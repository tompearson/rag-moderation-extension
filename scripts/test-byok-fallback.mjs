import assert from 'node:assert/strict';
import {
  isLikelyGeminiKeyAuthFailure,
  shouldClearByokWithoutKey,
  sharedPoolActiveStatusMessage,
  shouldShowSharedPoolStatusForModerationError,
  geminiKeyAuthFailureStatusMessage,
  byokQuotaWithSharedPoolHint,
  isUsingSharedPoolForModeration,
} from '../lib/geminiByok.js';

assert.equal(shouldClearByokWithoutKey({ geminiByokEnabled: true, geminiApiKey: '' }), true);
assert.equal(
  shouldClearByokWithoutKey({ geminiByokEnabled: false, geminiApiKey: '' }),
  false,
);
assert.equal(
  shouldClearByokWithoutKey({
    geminiByokEnabled: true,
    geminiApiKey: 'A'.repeat(40),
  }),
  false,
);

assert.equal(isLikelyGeminiKeyAuthFailure('API key not valid'), true);
assert.equal(isLikelyGeminiKeyAuthFailure('Gemini API quota exceeded.'), false);
assert.equal(isLikelyGeminiKeyAuthFailure(''), false);

assert.match(sharedPoolActiveStatusMessage(), /shared moderations/i);
assert.match(sharedPoolActiveStatusMessage(), /Save your own Gemini key/i);

assert.equal(
  shouldShowSharedPoolStatusForModerationError(
    'Invalid API origin. Check Options → environment profile.',
  ),
  false,
);
assert.equal(shouldShowSharedPoolStatusForModerationError('Host permission denied'), false);

assert.match(geminiKeyAuthFailureStatusMessage(), /Remove key/i);
assert.doesNotMatch(geminiKeyAuthFailureStatusMessage(), /switched to/i);
assert.match(byokQuotaWithSharedPoolHint(), /Remove key/i);
assert.doesNotMatch(byokQuotaWithSharedPoolHint(), /Turn off Your key/i);

const key = 'A'.repeat(40);
assert.equal(isUsingSharedPoolForModeration({ geminiApiKey: key, geminiByokEnabled: false }), false);
assert.equal(isUsingSharedPoolForModeration({ geminiApiKey: '', geminiByokEnabled: false }), true);

console.log('OK — byok fallback tests passed');
