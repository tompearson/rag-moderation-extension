import assert from 'node:assert/strict';
import {
  attachGeminiKeyReadiness,
  buildGeminiKeyReadiness,
  computeReadinessFromValidateResult,
  GEMINI_KEY_READINESS,
  shouldRunRagStyleProbes,
} from '../lib/geminiKeyReadiness.js';

assert.equal(shouldRunRagStyleProbes(true, false), true);
assert.equal(shouldRunRagStyleProbes(false, false), false);

const ready = buildGeminiKeyReadiness({ valid: true, ragStyleChecked: true, ragAllOk: true });
assert.equal(ready.readiness, GEMINI_KEY_READINESS.READY);

const attached = attachGeminiKeyReadiness({ valid: true });
assert.ok(attached.summary);

const fromApi = computeReadinessFromValidateResult({
  valid: true,
  summary: 'From server',
  details: ['x'],
  readiness: GEMINI_KEY_READINESS.READY,
});
assert.equal(fromApi.summary, 'From server');

console.log('OK — gemini key readiness tests passed');
