import assert from 'node:assert/strict';
import {
  GET_GEMINI_API_KEY_GUIDE_URL,
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  EXTENSION_PRIVACY_POLICY_URL,
} from '../lib/geminiKeyUserHelp.js';

assert.equal(
  GET_GEMINI_API_KEY_GUIDE_URL,
  'https://www.airesearchdog.net/extension/get-gemini-api-key',
);
assert.match(GET_GEMINI_API_KEY_GUIDE_URL, /^https:\/\/www\.airesearchdog\.net\//);
assert.equal(
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  'https://www.airesearchdog.net/extension/get-gemini-api-key#extension',
);
assert.equal(
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  'https://www.airesearchdog.net/extension/install-chrome-extension',
);
assert.equal(
  EXTENSION_PRIVACY_POLICY_URL,
  'https://www.airesearchdog.net/extension/privacy',
);

console.log('test-gemini-key-user-help-url: ok');
