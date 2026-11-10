#!/usr/bin/env node
/**
 * Render docs/INSTALL_RAG_MODERATION_EXTENSION_CHROME.md → Universal public/extension/install-chrome-extension.html
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
const mdPath = join(extRoot, 'docs', 'INSTALL_RAG_MODERATION_EXTENSION_CHROME.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'install-chrome-extension.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## On this page \{#toc\}/m, '## On this page')
    .replace(/^## Part 1 — Install from the Chrome Web Store \{#install\}/m, '## Part 1 — Install from the Chrome Web Store')
    .replace(
      /^## Part 2 — Get a Gemini API key \(recommended\) \{#gemini\}/m,
      '## Part 2 — Get a Gemini API key (recommended)',
    )
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

function postprocessBodyHtml(html) {
  return html
    .replace(/<h2>On this page<\/h2>/, '<h2 id="toc">On this page</h2>')
    .replace(
      /<h2>Part 1 — Install from the Chrome Web Store<\/h2>/,
      '<h2 id="install">Part 1 — Install from the Chrome Web Store</h2>',
    )
    .replace(
      /<h2>Part 2 — Get a Gemini API key \(recommended\)<\/h2>/,
      '<h2 id="gemini">Part 2 — Get a Gemini API key (recommended)</h2>',
    )
    .replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>')
    .replace(
      /<li><p><strong>Pin the extension to the toolbar<\/strong><\/p>/,
      '<li id="pin-toolbar"><p><strong>Pin the extension to the toolbar</strong></p>',
    );
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Install RAG Moderation Assistant extension in Google Chrome',
  footerText: 'RAG Moderation Assistant — Chrome install help',
  pagePath: '/extension/install-chrome-extension',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

const imageOutDir = join(outDir, 'images');
const guideImages = [
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
for (const name of guideImages) {
  console.log(`Wrote ${join(imageOutDir, name)}`);
}
