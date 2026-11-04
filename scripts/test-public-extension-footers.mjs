#!/usr/bin/env node
/**
 * Every public/extension/*.html page: Privacy + Terms in footer only; AI notice in Related guides.
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
  assert.match(html, /site-footer__legal/, `${file}: missing legal footer row`);
  assert.match(html, /Privacy policy/, `${file}: missing privacy in footer`);
  assert.match(html, /Terms of use/, `${file}: missing terms in footer`);
  assert.doesNotMatch(
    html,
    new RegExp(`site-footer__legal"[\\s\\S]*?${aiHref}`),
    `${file}: AI notice must not be in footer`,
  );
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
