import assert from 'node:assert/strict';
import {
  GET_GEMINI_API_KEY_GUIDE_URL,
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  INSTALL_CHROME_EXTENSION_DEVELOPER_GUIDE_URL,
  EXTENSION_PRIVACY_POLICY_URL,
  EXTENSION_CONTACT_URL,
} from '../lib/geminiKeyUserHelp.js';

assert.equal(
  GET_GEMINI_API_KEY_GUIDE_URL,
  'https://www.airesearchdog.net/extension/get-gemini-api-key',
);
assert.match(GET_GEMINI_API_KEY_GUIDE_URL, /^https:\/\/www\.airesearchdog\.net\//);
assert.equal(
  GET_GEMINI_API_KEY_GUIDE_EXTENSION_URL,
  'https://www.airesearchdog.net/extension/get-gemini-api-key',
);
assert.equal(
  INSTALL_CHROME_EXTENSION_GUIDE_URL,
  'https://www.airesearchdog.net/extension/install-chrome-extension',
);
assert.equal(
  INSTALL_CHROME_EXTENSION_DEVELOPER_GUIDE_URL,
  'https://www.airesearchdog.net/extension/install-chrome-extension-developer',
);
assert.equal(
  EXTENSION_PRIVACY_POLICY_URL,
  'https://www.airesearchdog.net/extension/privacy',
);
assert.equal(
  EXTENSION_CONTACT_URL,
  'https://www.airesearchdog.net/extension/contact',
);

console.log('test-gemini-key-user-help-url: ok');
