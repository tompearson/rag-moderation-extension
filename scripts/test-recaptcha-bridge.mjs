#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recaptchaBridgePageUrl } from '../lib/recaptchaBridge.js';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(
  recaptchaBridgePageUrl('https://www.airesearchdog.net'),
  'https://www.airesearchdog.net/extension/recaptcha-bridge.html',
  'bridge URL',
);
assert.equal(
  recaptchaBridgePageUrl('https://www.airesearchdog.net/'),
  'https://www.airesearchdog.net/extension/recaptcha-bridge.html',
  'trailing slash',
);

const template = readFileSync(join(extRoot, 'docs', 'static', 'recaptcha-bridge.html'), 'utf8');
assert.match(template, /recaptcha-token-request/, 'template handles token request');
assert.match(template, /ALLOWED_EXTENSION_IDS/, 'template has allowlist');
assert.doesNotMatch(template, /RECAPTCHA_SECRET/, 'template must not embed secret');
assert.doesNotMatch(template, /Token request already in progress/, 'bridge queues instead of busy error');
assert.match(template, /requestQueue/, 'bridge serializes token queue');

console.log('test-recaptcha-bridge: ok');
