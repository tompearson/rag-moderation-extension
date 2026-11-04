#!/usr/bin/env node
/**
 * Render docs/TERMS_EXTENSION.md → Universal public/extension/terms.html
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
const mdPath = join(extRoot, 'docs', 'TERMS_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'terms.html');

function preprocessMarkdown(raw) {
  return raw.replace(/^## Related guides \{#related\}/m, '## Related guides');
}

function postprocessBodyHtml(html) {
  return html.replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Terms of Use — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — terms of use',
  pagePath: '/extension/terms',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
