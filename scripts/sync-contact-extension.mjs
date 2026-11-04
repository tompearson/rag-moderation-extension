#!/usr/bin/env node
/**
 * Render docs/CONTACT_EXTENSION.md → Universal public/extension/contact.html
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
const mdPath = join(extRoot, 'docs', 'CONTACT_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'contact.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## info@airesearchdog\.net \{#info\}/m, '## info@airesearchdog.net')
    .replace(/^## help@airesearchdog\.net \{#help\}/m, '## help@airesearchdog.net')
    .replace(/^## admin@airesearchdog\.net \{#admin\}/m, '## admin@airesearchdog.net')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return html
    .replace(
      /<h2>info@airesearchdog\.net<\/h2>/,
      '<h2 id="info">info@airesearchdog.net</h2>',
    )
    .replace(
      /<h2>help@airesearchdog\.net<\/h2>/,
      '<h2 id="help">help@airesearchdog.net</h2>',
    )
    .replace(
      /<h2>admin@airesearchdog\.net<\/h2>/,
      '<h2 id="admin">admin@airesearchdog.net</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Contact — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — contact',
  pagePath: '/extension/contact',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
