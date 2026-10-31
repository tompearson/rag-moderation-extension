import { MAX_CAPTURE_CHARS, normalizeCapturedText } from '../lib/captureText.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(normalizeCapturedText('  hello  ') === 'hello', 'trim');
assert(normalizeCapturedText(null) === '', 'null');
assert(normalizeCapturedText('x'.repeat(MAX_CAPTURE_CHARS + 10)).length === MAX_CAPTURE_CHARS, 'cap');

console.log('OK — capture text tests passed');
