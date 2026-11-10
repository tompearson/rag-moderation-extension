#!/usr/bin/env node
/**
 * Render docs/PRIVACY_POLICY_EXTENSION.md → Universal public/extension/privacy.html
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
const mdPath = join(extRoot, 'docs', 'PRIVACY_POLICY_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'privacy.html');

const SECTION_IDS = [
  ['On this page', 'toc'],
  ['Summary', 'summary'],
  ['Who this is for', 'who-this-is-for'],
  ['Costs, quotas, and your Gemini key', 'costs-quotas-and-your-gemini-key'],
  ['Information the extension processes', 'information-the-extension-processes'],
  ['What stays on your device', 'what-stays-on-your-device'],
  ['What is sent to servers', 'what-is-sent-to-servers'],
  ['Access to web pages', 'access-to-web-pages'],
  ['Clipboard', 'clipboard'],
  ['Children', 'children'],
  ['Security', 'security'],
  ['Your choices', 'your-choices'],
  ['Changes', 'changes'],
  ['Related guides', 'related'],
  ['Contact', 'contact'],
];

function preprocessMarkdown(raw) {
  return stripSectionIdMarkers(raw, SECTION_IDS);
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  return applySectionHeadingIds(html, SECTION_IDS);
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
