import assert from 'node:assert/strict';
import {
  formatGeminiKeySuffixLabel,
  geminiKeyLastFour,
  hasSavedGeminiKey,
  isByokConfigured,
  isByokActiveForProvider,
  resolveUserApiKeyForModeration,
  isRagProviderId,
} from '../lib/geminiByok.js';

const key = 'A'.repeat(40);
const base = {
  geminiByokEnabled: true,
  geminiApiKey: key,
  ragProvider: 'NextDoor-prompt-production-28-rag',
};

assert.equal(isRagProviderId(base.ragProvider), true);
assert.equal(hasSavedGeminiKey(base), true);
assert.equal(hasSavedGeminiKey({ geminiApiKey: '' }), false);
assert.equal(geminiKeyLastFour('AIzaSyABCDEF1234567890'), '7890');
assert.equal(formatGeminiKeySuffixLabel('AIzaSyABCDEF1234567890'), '…7890');
assert.equal(isByokConfigured(base), true);
assert.equal(isByokConfigured({ ...base, geminiByokEnabled: false }), false);
assert.equal(isByokConfigured({ ...base, geminiApiKey: '' }), false);
assert.equal(isByokActiveForProvider(base), true);
assert.equal(resolveUserApiKeyForModeration(base), key);

const nonRag = { ...base, ragProvider: 'NextDoor-prompt-production-28' };
assert.equal(resolveUserApiKeyForModeration(nonRag), key);

assert.equal(resolveUserApiKeyForModeration({ ...base, geminiByokEnabled: false }), null);

console.log('OK — gemini BYOK tests passed');
