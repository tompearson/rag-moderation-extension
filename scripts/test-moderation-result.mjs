import assert from 'node:assert/strict';
import {
  isModerationFailureResult,
  moderationFailureStatusMessage,
  sanitizeModerationReason,
} from '../lib/moderationResult.js';

assert.equal(isModerationFailureResult({ decision: 'Keep' }), false);
assert.equal(isModerationFailureResult({ decision: 'Error', reason: 'x' }), true);
const quotaMsg = moderationFailureStatusMessage({
  decision: 'Error',
  reason: 'Failed to moderate: Gemini API quota exceeded',
});
assert.match(quotaMsg, /quota/i);
assert.match(quotaMsg, /aistudio\.google\.com\/apikey/);

const rag503 =
  'Failed to moderate content: RAG moderation unavailable (503): Gemini API quota exceeded. /health only verifies the Pinecone index; use POST /moderate.';
assert.equal(
  sanitizeModerationReason(rag503),
  'Failed to moderate content: RAG moderation unavailable (503): Gemini API quota exceeded.',
);

const ragDown = moderationFailureStatusMessage({
  decision: 'Error',
  reason:
    'Failed to moderate content: RAG moderation service error: fetch failed (POST http://127.0.0.1:8000/moderate; ECONNREFUSED)',
});
assert.match(ragDown, /port 8000/);
assert.match(ragDown, /npm run dev/);

console.log('test-moderation-result: ok');
