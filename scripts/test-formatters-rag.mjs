import assert from 'node:assert/strict';
import {
  isRagModerationResult,
  renderRagSourcesFoldHtml,
} from '../lib/formatters.js';

assert.equal(isRagModerationResult({ moderationMode: 'rag' }), true);
assert.equal(isRagModerationResult({ moderationMode: 'full_prompt' }), false);

assert.equal(renderRagSourcesFoldHtml([], { moderationMode: 'full_prompt' }), '');

const emptyRag = renderRagSourcesFoldHtml([], { moderationMode: 'rag' });
assert.match(emptyRag, /Retrieved guidelines/);
assert.match(emptyRag, /No retrieved guidelines were returned/);

const withSources = renderRagSourcesFoldHtml(
  [{ title: 'T', source: 'https://example.com', preview: 'p' }],
  { moderationMode: 'rag' },
);
assert.match(withSources, /Retrieved guidelines \(1\)/);

console.log('test-formatters-rag: ok');
