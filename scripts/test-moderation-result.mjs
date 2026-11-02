import assert from 'node:assert/strict';
import {
  isModerationFailureResult,
  moderationFailureStatusMessage,
} from '../lib/moderationResult.js';

assert.equal(isModerationFailureResult({ decision: 'Keep' }), false);
assert.equal(isModerationFailureResult({ decision: 'Error', reason: 'x' }), true);
const quotaMsg = moderationFailureStatusMessage({
  decision: 'Error',
  reason: 'Failed to moderate: Gemini API quota exceeded',
});
assert.match(quotaMsg, /quota/i);
assert.match(quotaMsg, /aistudio\.google\.com\/apikey/);

console.log('test-moderation-result: ok');
