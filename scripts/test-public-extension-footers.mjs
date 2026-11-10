#!/usr/bin/env node
/**
 * Every public/extension/*.html page: footer site map, legal row (Privacy · Terms), Related guides.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTENSION_AI_GENERATED_ANALYSIS_PATH } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extensionPublicDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
  'public',
  'extension',
);

if (!existsSync(extensionPublicDir)) {
  console.log(
    'test-public-extension-footers: skip (no synced HTML — run npm run sync:public-guides with Moderation-Tool-Universal checkout)',
  );
  process.exit(0);
}

const htmlFiles = readdirSync(extensionPublicDir)
  .filter((name) => name.endsWith('.html'))
  .sort();

assert.ok(htmlFiles.length > 0, 'expected synced HTML under public/extension');

const aiHref = EXTENSION_AI_GENERATED_ANALYSIS_PATH.replace(/\//g, '\\/');

for (const file of htmlFiles) {
  const html = readFileSync(join(extensionPublicDir, file), 'utf8');
  assert.match(html, /site-footer__sitemap/, `${file}: missing footer site map`);
  assert.match(html, /site-footer__legal/, `${file}: missing legal footer row`);
  assert.match(html, /Privacy policy/, `${file}: missing privacy in footer`);
  assert.match(html, /Terms of use/, `${file}: missing terms in footer`);
  const legalRow = html.match(/<p class="site-footer__line site-footer__legal">[\s\S]*?<\/p>/);
  assert.ok(legalRow, `${file}: missing legal footer row element`);
  assert.doesNotMatch(
    legalRow[0],
    new RegExp(aiHref),
    `${file}: AI notice must not be in legal footer row`,
  );
  if (file !== 'important-ai-generated-analysis.html') {
    assert.match(
      html,
      new RegExp(`site-footer__sitemap[\\s\\S]*${aiHref}`),
      `${file}: AI notice missing from site map`,
    );
  }
  assert.match(html, new RegExp(`id="related">Related guides`), `${file}: missing Related guides`);
  if (file !== 'important-ai-generated-analysis.html') {
    assert.match(
      html,
      new RegExp(`${aiHref}">Important — AI-generated analysis`),
      `${file}: missing AI notice in Related guides`,
    );
  }
}

console.log(`test-public-extension-footers: ok (${htmlFiles.length} pages)`);
