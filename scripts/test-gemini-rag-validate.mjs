import assert from 'node:assert/strict';
import {
  looksLikeGeminiQuotaOrRateLimit,
  looksLikeInvalidGeminiKey,
} from '../lib/validateGeminiRagStyle.js';

assert.equal(looksLikeGeminiQuotaOrRateLimit('RESOURCE_EXHAUSTED', 429), true);
assert.equal(
  looksLikeGeminiQuotaOrRateLimit('generate_content_free_tier_requests', 429),
  true,
);
assert.equal(looksLikeInvalidGeminiKey('API key not valid. Please pass a valid API key.'), true);
assert.equal(looksLikeGeminiQuotaOrRateLimit('API key not valid', 400), false);

console.log('test-gemini-rag-validate: ok');
