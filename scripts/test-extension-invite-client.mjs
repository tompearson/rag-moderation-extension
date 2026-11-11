#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  postExtensionInviteFriend,
  resolveInstallGuideUrlForInvite,
  INVITE_PERSONAL_MESSAGE_MAX,
} from '../lib/extensionInviteClient.js';
import { GET_LATEST_EXTENSION_GUIDE_URL } from '../lib/geminiKeyUserHelp.js';

assert.equal(INVITE_PERSONAL_MESSAGE_MAX, 300);
assert.equal(resolveInstallGuideUrlForInvite(), GET_LATEST_EXTENSION_GUIDE_URL);

/** @type {{ url: string; body: Record<string, unknown> }[]} */
const calls = [];
const priorFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({
    url: String(url),
    body: JSON.parse(String(init?.body)),
  });
  return new Response(JSON.stringify({ success: true, message: 'Invite sent.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

try {
  await postExtensionInviteFriend('https://www.airesearchdog.net/', {
    friendEmail: 'friend@example.com',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://www.airesearchdog.net/api/extension-invite');
  assert.equal(calls[0].body.friendEmail, 'friend@example.com');
  assert.equal(calls[0].body.installGuideUrl, GET_LATEST_EXTENSION_GUIDE_URL);
  assert.equal(calls[0].body.personalMessage, undefined);

  calls.length = 0;
  await postExtensionInviteFriend('https://api.example.com/', {
    friendEmail: 'a@b.co',
    personalMessage: '  hi there  ',
    installGuideUrl: 'https://www.airesearchdog.net/extension/install-chrome-extension',
  });
  assert.equal(calls[0].body.personalMessage, 'hi there');
  assert.equal(
    calls[0].body.installGuideUrl,
    'https://www.airesearchdog.net/extension/install-chrome-extension',
  );

  calls.length = 0;
  const long = 'x'.repeat(400);
  await postExtensionInviteFriend('https://api.example.com/', {
    friendEmail: 'a@b.co',
    personalMessage: long,
  });
  assert.equal(calls[0].body.personalMessage.length, 300);

  calls.length = 0;
  await postExtensionInviteFriend('https://host///', { friendEmail: 'a@b.co' });
  assert.equal(calls[0].url, 'https://host/api/extension-invite');
} finally {
  globalThis.fetch = priorFetch;
}

console.log('OK — extension invite client (URL and body shape)');
