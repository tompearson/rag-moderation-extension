#!/usr/bin/env node
/**
 * Render docs/VISUAL_MODERATION_STEP_BY_STEP_EXTENSION.md → Universal public/extension/visual-moderation-step-by-step.html
 * After first publish: add /extension/visual-moderation-step-by-step redirect in Moderation-Tool-Universal/vercel.json.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'VISUAL_MODERATION_STEP_BY_STEP_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'visual-moderation-step-by-step.html');

const SECTION_IDS = [
  ['On this page', 'toc'],
  ['Before you start', 'before-you-start'],
  ['Step 1 — Open the panel', 'step-1'],
  ['Step 2 — Pick text on the page', 'step-2'],
  ['Step 3 — Review and Moderate', 'step-3'],
  ['Step 4 — Read Results', 'step-4'],
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
  pageTitle: 'Visual moderation step by step',
  footerText: 'RAG Moderation Assistant — visual workflow',
  pagePath: '/extension/visual-moderation-step-by-step',
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
  if (name.startsWith('how-to-moderate-walkthrough-') && name.endsWith('.png')) {
    copyFileSync(join(imagesDir, name), join(imagesOut, name));
  }
}
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
