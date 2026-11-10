#!/usr/bin/env node
/**
 * Render docs/TERMS_EXTENSION.md → Universal public/extension/terms.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';
import { applySectionHeadingIds, stripSectionIdMarkers } from './lib/guide-section-ids.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'TERMS_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'terms.html');

const SECTION_IDS = [
  ['On this page', 'toc'],
  ['Who may use the extension', 'who-may-use-the-extension'],
  ['What the service provides', 'what-the-service-provides'],
  ['Acceptable use', 'acceptable-use'],
  ['Your Gemini API key (optional)', 'your-gemini-api-key-optional'],
  ['Content you submit', 'content-you-submit'],
  ['Disclaimers', 'disclaimers'],
  ['Limitation of liability', 'limitation-of-liability'],
  ['Third parties', 'third-parties'],
  ['Changes and termination', 'changes-and-termination'],
  ['Related guides', 'related'],
  ['Contact', 'contact'],
];

function preprocessMarkdown(raw) {
  return stripSectionIdMarkers(raw, SECTION_IDS);
}

function postprocessBodyHtml(html) {
  return applySectionHeadingIds(html, SECTION_IDS);
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
