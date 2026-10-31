import assert from 'node:assert/strict';
import {
  isModerationFailureResult,
  moderationFailureStatusMessage,
} from '../lib/moderationResult.js';

assert.equal(isModerationFailureResult({ decision: 'Keep' }), false);
assert.equal(isModerationFailureResult({ decision: 'Error', reason: 'x' }), true);
assert.match(
  moderationFailureStatusMessage({
    decision: 'Error',
    reason: 'Failed to moderate: Gemini API quota exceeded',
  }),
  /quota/i,
);

console.log('test-moderation-result: ok');
