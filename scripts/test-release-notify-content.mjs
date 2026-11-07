#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildReleaseNotifyContent } from './releaseNotifyContent.mjs';

const { subject, textBody, htmlBody, markdownBody, assetUrl } = buildReleaseNotifyContent({
  repository: 'tompearson/rag-moderation-extension',
  refName: 'v1.2.3',
  zipSha: 'abc123',
});

assert.match(subject, /v1\.2\.3/);
assert.match(textBody, /abc123/);
assert.match(textBody, /install-chrome-extension-developer/);
assert.match(textBody, /how-to-moderate-user-posts/);
assert.match(htmlBody, /abc123/);
assert.match(markdownBody, /rag-moderation-assistant-1\.2\.3\.zip/);
assert.equal(
  assetUrl,
  'https://github.com/tompearson/rag-moderation-extension/releases/download/v1.2.3/rag-moderation-assistant-1.2.3.zip',
);

console.log('test-release-notify-content: ok');
