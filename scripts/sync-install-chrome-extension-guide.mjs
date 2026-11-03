#!/usr/bin/env node
/**
 * Render docs/INSTALL_RAG_MODERATION_EXTENSION_CHROME.md → Universal public/extension/install-chrome-extension.html
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
const mdPath = join(extRoot, 'docs', 'INSTALL_RAG_MODERATION_EXTENSION_CHROME.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'install-chrome-extension.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## Part 1 — Install from the Chrome Web Store \{#install\}/m, '## Part 1 — Install from the Chrome Web Store')
    .replace(/^## Part 2 — Manage the extension \{#manage\}/m, '## Part 2 — Manage the extension');
}

function postprocessBodyHtml(html) {
  return html
    .replace(
      /<h2>Part 1 — Install from the Chrome Web Store<\/h2>/,
      '<h2 id="install">Part 1 — Install from the Chrome Web Store</h2>',
    )
    .replace(
      /<h2>Part 2 — Manage the extension<\/h2>/,
      '<h2 id="manage">Part 2 — Manage the extension</h2>',
    );
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Install RAG Moderation Assistant extension in Google Chrome',
  footerText: 'RAG Moderation Assistant — Chrome install help',
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
