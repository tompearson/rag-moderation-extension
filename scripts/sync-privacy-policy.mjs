#!/usr/bin/env node
/**
 * Render docs/PRIVACY_POLICY_EXTENSION.md → Universal public/extension/privacy.html
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
const mdPath = join(extRoot, 'docs', 'PRIVACY_POLICY_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'privacy.html');

function preprocessMarkdown(raw) {
  return raw.replace(/^## Related guides \{#related\}/m, '## Related guides');
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return html
    .replace(
      /<h2>Costs, quotas, and your Gemini key<\/h2>/,
      '<h2 id="costs-quotas-and-your-gemini-key">Costs, quotas, and your Gemini key</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>')
    .replace(
      /<h3>Email and @airesearchdog\.net addresses<\/h3>/,
      '<h3 id="email-and-airesearchdognet-addresses">Email and @airesearchdog.net addresses</h3>',
    );
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Privacy Policy — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — privacy policy',
  pagePath: '/extension/privacy',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
