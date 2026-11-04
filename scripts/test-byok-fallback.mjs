import assert from 'node:assert/strict';
import {
  isLikelyGeminiKeyAuthFailure,
  shouldClearByokWithoutKey,
  sharedPoolActiveStatusMessage,
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

assert.match(sharedPoolActiveStatusMessage(), /borrowed key/i);
assert.match(sharedPoolActiveStatusMessage(), /Save key/i);
assert.match(sharedPoolActiveStatusMessage(), /quota runs out/i);

console.log('OK — byok fallback tests passed');
