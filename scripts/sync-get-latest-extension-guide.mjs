#!/usr/bin/env node
/**
 * Render docs/GET_LATEST_EXTENSION.md → Universal public/extension/get-latest-extension.html
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DOWNLOAD_PATH,
  STABLE_ZIP_NAME,
  formatLatestReleaseMetadataForGuide,
  resolveUniversalDir,
} from './lib/latestReleaseArtifacts.mjs';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolveUniversalDir(extRoot);
const mdPath = join(extRoot, 'docs', 'GET_LATEST_EXTENSION.md');
const jsonPath = join(extRoot, 'docs', 'data', 'latest-release.json');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'get-latest-extension.html');

const PLACEHOLDER = '<!-- LATEST_RELEASE_METADATA -->';

function loadMarkdownWithMetadata() {
  let raw = readFileSync(mdPath, 'utf8');
  if (!raw.includes(PLACEHOLDER)) {
    throw new Error(`Missing ${PLACEHOLDER} in ${mdPath}`);
  }
  if (!existsSync(jsonPath)) {
    throw new Error(
      `Missing ${jsonPath} — run npm run package:store (writes metadata + copies ZIP) first`,
    );
  }
  const meta = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const block = formatLatestReleaseMetadataForGuide(meta);
  return raw.replace(PLACEHOLDER, block);
}

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## On this page \{#toc\}/m, '## On this page')
    .replace(/^## After you download \{#after-you-download\}/m, '## After you download')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

function postprocessBodyHtml(html) {
  const downloadHref = DOWNLOAD_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const downloadLinkRe = new RegExp(
    `<a href="${downloadHref}">Download latest build</a>`,
    'g',
  );
  return html
    .replace(
      downloadLinkRe,
      `<a id="download" href="${DOWNLOAD_PATH}">Download latest build</a>`,
    )
    .replace(
      /<h2>Current sideload build<\/h2>/,
      '<h2 id="current-sideload-build">Current sideload build</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>')
    .replace(
      /<h2>After you download<\/h2>/,
      '<h2 id="after-you-download">After you download</h2>',
    )
    .replace(/<h2>On this page<\/h2>/, '<h2 id="toc">On this page</h2>');
}

const markdown = loadMarkdownWithMetadata();
const html = renderExtensionGuideHtml({
  pageTitle: 'Get the latest RAG Moderation Assistant (sideload)',
  footerText: 'RAG Moderation Assistant — latest sideload download',
  pagePath: '/extension/get-latest-extension',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
