import assert from 'node:assert/strict';
import {
  DEFAULT_RAG_PROVIDER,
  RAG_PROVIDER_OPTIONS,
  resolveStoredRagProviderId,
} from '../lib/ragProviders.js';

assert.equal(DEFAULT_RAG_PROVIDER, 'NextDoor-prompt-production-28-rag');
assert.equal(RAG_PROVIDER_OPTIONS.length, 2);
assert.equal(RAG_PROVIDER_OPTIONS[1].id, 'NextDoor-prompt-production-28');
assert.equal(resolveStoredRagProviderId(''), DEFAULT_RAG_PROVIDER);
assert.equal(resolveStoredRagProviderId('NextDoor-prompt-production-28'), 'NextDoor-prompt-production-28');
assert.equal(resolveStoredRagProviderId('legacy-custom-id'), 'legacy-custom-id');

console.log('test-rag-providers: ok');
