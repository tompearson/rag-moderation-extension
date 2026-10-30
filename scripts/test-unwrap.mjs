import { unwrapModerationResult, formatHttpError } from '../lib/moderateClient.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const wrapped = unwrapModerationResult({ success: true, data: { decision: 'Keep', moderationMode: 'rag' } });
assert(wrapped.decision === 'Keep', 'unwrap data');

const flat = unwrapModerationResult({ decision: 'Remove', moderationMode: 'rag' });
assert(flat.decision === 'Remove', 'unwrap flat');

let threw = false;
try {
  unwrapModerationResult({ success: false, error: 'nope' });
} catch (e) {
  threw = true;
  assert(String(e.message).includes('nope'), 'error message');
}
assert(threw, 'success false throws');

const errMsg = formatHttpError({ status: 503 }, JSON.stringify({ detail: 'Gemini quota' }));
assert(/503/.test(errMsg), 'format 503');

console.log('OK — moderateClient unwrap tests passed');
