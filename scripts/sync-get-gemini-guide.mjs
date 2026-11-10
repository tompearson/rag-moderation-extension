#!/usr/bin/env node
/**
 * Render docs/GET_GEMINI_API_KEY_EXTENSION.md → Universal public/extension/get-gemini-api-key.html
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml, wrapGuideBackgroundFold } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'GET_GEMINI_API_KEY_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'get-gemini-api-key.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## On this page \{#toc\}/m, '## On this page')
    .replace(/^## Part 1 — Obtain a key from Google \{#google\}/m, '## Part 1 — Obtain a key from Google')
    .replace(/^## Part 2 — Add your key in the extension \{#options\}/m, '## Part 2 — Add your key in the extension')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return wrapGuideBackgroundFold(
    html
      .replace(/<h2>On this page<\/h2>/, '<h2 id="toc">On this page</h2>')
      .replace(
        /<h2>Part 1 — Obtain a key from Google<\/h2>/,
        '<h2 id="google">Part 1 — Obtain a key from Google</h2>',
      )
      .replace(
        /<h2>Part 2 — Add your key in the extension<\/h2>/,
        '<h2 id="options">Part 2 — Add your key in the extension</h2>',
      )
      .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>'),
    'google',
    'Background',
  );
}

const guideImages = ['get-gemini-options-paste-key.png'];

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Get a Gemini API key for moderation',
  footerText: 'RAG Moderation Assistant — optional BYOK help',
  pagePath: '/extension/get-gemini-api-key',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

const imageOutDir = join(outDir, 'images');

mkdirSync(outDir, { recursive: true });
mkdirSync(imageOutDir, { recursive: true });
for (const name of guideImages) {
  const src = join(extRoot, 'docs', 'images', name);
  if (!existsSync(src)) {
    console.warn(`Skip missing guide image: ${src}`);
    continue;
  }
  copyFileSync(src, join(imageOutDir, name));
  console.log(`Wrote ${join(imageOutDir, name)}`);
}
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
