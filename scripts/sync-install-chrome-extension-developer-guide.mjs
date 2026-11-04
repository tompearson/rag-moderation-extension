#!/usr/bin/env node
/**
 * Render docs/INSTALL_RAG_MODERATION_EXTENSION_CHROME_DEVELOPER.md → Universal public/extension/install-chrome-extension-developer.html
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'INSTALL_RAG_MODERATION_EXTENSION_CHROME_DEVELOPER.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'install-chrome-extension-developer.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## Part 1 — Enable an unpacked extension \{#developer\}/m, '## Part 1 — Enable an unpacked extension')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

function postprocessBodyHtml(html) {
  return html
    .replace(
      /<h2>Part 1 — Enable an unpacked extension<\/h2>/,
      '<h2 id="developer">Part 1 — Enable an unpacked extension</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Install RAG Moderation Assistant (developer / unpacked)',
  footerText: 'RAG Moderation Assistant — developer install help',
  pagePath: '/extension/install-chrome-extension-developer',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

const imageOutDir = join(outDir, 'images');
const guideImages = [
  'install-chrome-developer-mode.png',
  'install-chrome-extensions-card-enabled.png',
  'install-chrome-extensions-puzzle-chicklet.png',
  'install-chrome-extensions-pin-thumbtack.png',
  'install-chrome-toolbar-extension-icon.png',
];

mkdirSync(outDir, { recursive: true });
mkdirSync(imageOutDir, { recursive: true });
for (const name of guideImages) {
  const src = join(extRoot, 'docs', 'images', name);
  if (!existsSync(src)) {
    console.warn(`Skip missing guide image: ${src}`);
    continue;
  }
  copyFileSync(src, join(imageOutDir, name));
}
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
