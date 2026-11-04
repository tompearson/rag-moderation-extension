#!/usr/bin/env node
/**
 * Every public/extension/*.html page must include Privacy, Terms, and AI analysis in site-footer__legal.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionPublicDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
  'public',
  'extension',
);

const AI_NOTICE_HREF = '/extension/important-ai-generated-analysis';
const htmlFiles = readdirSync(extensionPublicDir)
  .filter((name) => name.endsWith('.html'))
  .sort();

assert.ok(htmlFiles.length > 0, 'expected synced HTML under public/extension');

for (const file of htmlFiles) {
  const html = readFileSync(join(extensionPublicDir, file), 'utf8');
  assert.match(html, /site-footer__legal/, `${file}: missing legal footer row`);
  assert.match(html, /Privacy policy/, `${file}: missing privacy in footer`);
  assert.match(html, /Terms of use/, `${file}: missing terms in footer`);
  assert.match(html, /AI-generated analysis/, `${file}: missing AI notice label in footer`);

  if (file === 'important-ai-generated-analysis.html') {
    assert.match(
      html,
      /site-footer__legal">[\s\S]*?AI-generated analysis[\s\S]*?<\/p>/,
      `${file}: AI notice should appear in footer on this page`,
    );
  } else {
    assert.match(
      html,
      new RegExp(`href="${AI_NOTICE_HREF.replace(/\//g, '\\/')}">AI-generated analysis`),
      `${file}: missing AI notice link`,
    );
  }
}

console.log(`test-public-extension-footers: ok (${htmlFiles.length} pages)`);
