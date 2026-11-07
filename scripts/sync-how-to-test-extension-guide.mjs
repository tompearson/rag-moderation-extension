#!/usr/bin/env node
/**
 * Render docs/HOW_TO_TEST_RAG_MODERATION_EXTENSION.md → Universal public/extension/how-to-test-extension.html
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'HOW_TO_TEST_RAG_MODERATION_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'how-to-test-extension.html');

const SECTION_IDS = [
  ['On this page', 'toc'],
  ['How we test', 'how-we-test'],
  ['Before you test', 'before-you-test'],
  ['Critical path (about 10 minutes)', 'critical-path'],
  ['Feature checklists', 'feature-checklists'],
  ['Negative checks', 'negative-checks'],
  ['What we are not testing', 'out-of-scope'],
  ['Screenshots', 'screenshots'],
  ['Related guides', 'related'],
];

function preprocessMarkdown(raw) {
  let out = raw;
  for (const [title, id] of SECTION_IDS) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`^## ${escaped} \\{#${id}\\}`, 'm'), `## ${title}`);
  }
  return out;
}

function postprocessBodyHtml(html) {
  let out = html;
  for (const [title, id] of SECTION_IDS) {
    out = out.replace(
      new RegExp(`<h2>${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h2>`),
      `<h2 id="${id}">${title}</h2>`,
    );
  }
  return out;
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'How to test the RAG Moderation Extension',
  footerText: 'RAG Moderation Assistant — sideload QA',
  pagePath: '/extension/how-to-test-extension',
  showGuideNav: false,
  bodyClass: 'guide-page--walkthrough',
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
const imagesDir = join(extRoot, 'docs', 'images');
const imagesOut = join(outDir, 'images');
mkdirSync(imagesOut, { recursive: true });
for (const name of readdirSync(imagesDir)) {
  if (
    (name.startsWith('how-to-moderate-walkthrough-') || name.startsWith('how-to-test-')) &&
    name.endsWith('.png')
  ) {
    copyFileSync(join(imagesDir, name), join(imagesOut, name));
  }
}
const optionalTestImages = [
  'how-to-test-options-production.png',
  'how-to-test-contact-modal.png',
];
for (const name of optionalTestImages) {
  const src = join(imagesDir, name);
  if (existsSync(src)) {
    copyFileSync(src, join(imagesOut, name));
  }
}

writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
