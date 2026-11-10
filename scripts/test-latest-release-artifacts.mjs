import assert from 'node:assert/strict';
import {
  DOWNLOAD_PATH,
  formatLatestReleaseMetadataForGuide,
} from './lib/latestReleaseArtifacts.mjs';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const fixture = {
  version: '1.2.3',
  sha256: 'a'.repeat(64),
  builtAt: '2026-01-15T12:00:00.000Z',
  zipFileName: 'rag-moderation-assistant.zip',
  downloadPath: DOWNLOAD_PATH,
  versionedZipFileName: 'rag-moderation-assistant-1.2.3.zip',
};

const block = formatLatestReleaseMetadataForGuide(fixture);
assert.match(block, /1\.2\.3/, 'version in metadata');
assert.match(block, /a{64}/, 'sha256 in metadata');
assert.match(block, new RegExp(`\\]\\(${DOWNLOAD_PATH.replace(/\//g, '\\/')}\\)`), 'download link');

const md = `# Get latest

${block}
`;
const html = renderExtensionGuideHtml({
  pageTitle: 'Test get-latest',
  footerText: 'Footer',
  pagePath: '/extension/get-latest-extension',
  markdown: md,
});

assert.match(html, /1\.2\.3/, 'version in html');
assert.match(html, /aaaa/, 'sha prefix in html');
assert.match(html, new RegExp(`href="${DOWNLOAD_PATH.replace(/\//g, '\\/')}"`), 'stable download href');

console.log('test-latest-release-artifacts: ok');
