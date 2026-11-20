#!/usr/bin/env node
/**
 * Render docs/NEXTDOOR_POLICY_COMPLIANCE_MATRIX.md → Universal public/extension/nextdoor-policy-compliance-matrix.html
 * Copy docs/assets/Nextdoor_Policy_Compliance_Matrix-v4.pdf → Universal public/extension/downloads/
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'NEXTDOOR_POLICY_COMPLIANCE_MATRIX.md');
const pdfSrc = join(extRoot, 'docs', 'assets', 'Nextdoor_Policy_Compliance_Matrix-v4.pdf');
const outDir = join(universalDir, 'public', 'extension');
const downloadsDir = join(outDir, 'downloads');
const outPath = join(outDir, 'nextdoor-policy-compliance-matrix.html');
const pdfDest = join(downloadsDir, 'Nextdoor_Policy_Compliance_Matrix-v4.pdf');

function preprocessMarkdown(raw) {
  return raw.replace(/^## Related guides \{#related\}/m, '## Related guides');
}

function postprocessBodyHtml(html) {
  return html.replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

mkdirSync(downloadsDir, { recursive: true });
copyFileSync(pdfSrc, pdfDest);

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Nextdoor Policy Compliance Matrix — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — policy compliance matrix',
  pagePath: '/extension/nextdoor-policy-compliance-matrix',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
console.log(`Wrote ${pdfDest}`);