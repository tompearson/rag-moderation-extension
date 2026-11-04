#!/usr/bin/env node
/**
 * Render docs/HOW_TO_MODERATE_USER_POSTS_EXTENSION.md → Universal public/extension/how-to-moderate-user-posts.html
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
const mdPath = join(extRoot, 'docs', 'HOW_TO_MODERATE_USER_POSTS_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'how-to-moderate-user-posts.html');

const SECTION_IDS = [
  ['On this page', 'toc'],
  ['Before you moderate', 'before-you-moderate'],
  ['Open the side panel', 'open-the-side-panel'],
  ['Confirm feed location', 'confirm-feed-location'],
  ['Put post text in the panel', 'put-post-text-in-the-panel'],
  ['Choose analysis settings', 'choose-analysis-settings'],
  ['Run Moderate and watch progress', 'run-moderate'],
  ['Read the results', 'read-the-results'],
  ['Decision Breakdown and your call', 'decision-breakdown'],
  ['After a run: clear, stop, or repeat', 'after-a-run'],
  ['Optional: your Gemini key, reports, and feedback', 'optional-byok-reports'],
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
  pageTitle: 'How to use the extension to moderate user posts',
  footerText: 'RAG Moderation Assistant — moderation workflow',
  pagePath: '/extension/how-to-moderate-user-posts',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
