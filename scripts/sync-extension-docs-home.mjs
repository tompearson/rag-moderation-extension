#!/usr/bin/env node
/**
 * Render docs/EXTENSION_DOCS_HOME.md → Universal public/extension/guides.html
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
const mdPath = join(extRoot, 'docs', 'EXTENSION_DOCS_HOME.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'guides.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## On this page \{#toc\}/m, '## On this page')
    .replace(/^## All guides \(in order\) \{#guides\}/m, '## All guides (in order)');
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return html
    .replace(/<h2>On this page<\/h2>/, '<h2 id="toc">On this page</h2>')
    .replace(/<h2>All guides \(in order\)<\/h2>/, '<h2 id="guides">All guides (in order)</h2>');
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'RAG Moderation Assistant — documentation',
  footerText: 'RAG Moderation Assistant — documentation home',
  pagePath: '/extension/guides',
  showGuideNav: true,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
