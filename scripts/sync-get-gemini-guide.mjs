#!/usr/bin/env node
/**
 * Render docs/GET_GEMINI_API_KEY_EXTENSION.md → Universal public/extension/get-gemini-api-key.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

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
    .replace(/^## Part 1 — Obtain a key from Google \{#google\}/m, '## Part 1 — Obtain a key from Google')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return html
    .replace(
      /<h2>Part 1 — Obtain a key from Google<\/h2>/,
      '<h2 id="google">Part 1 — Obtain a key from Google</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

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

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
