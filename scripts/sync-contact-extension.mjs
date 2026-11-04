#!/usr/bin/env node
/**
 * Render docs/CONTACT_EXTENSION.md → Universal public/extension/contact.html
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
const mdPath = join(extRoot, 'docs', 'CONTACT_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'contact.html');

function preprocessMarkdown(raw) {
  return raw
    .replace(/^## Outside the extension \{#scope\}/m, '## Outside the extension')
    .replace(/^## info@airesearchdog\.net \{#info\}/m, '## info@airesearchdog.net')
    .replace(/^## help@airesearchdog\.net \{#help\}/m, '## help@airesearchdog.net')
    .replace(/^## admin@airesearchdog\.net \{#admin\}/m, '## admin@airesearchdog.net')
    .replace(/^## Related guides \{#related\}/m, '## Related guides');
}

/**
 * @param {string} html
 * @param {string} email
 * @param {string} id
 */
function addContactHeadingId(html, email, id) {
  const esc = email.replace(/\./g, '\\.');
  const linked = `<a href="mailto:${email}">${email}</a>`.replace(/\./g, '\\.');
  return html
    .replace(
      new RegExp(`<h2>${linked}<\\/h2>`),
      `<h2 id="${id}"><a href="mailto:${email}">${email}</a></h2>`,
    )
    .replace(new RegExp(`<h2>${esc}<\\/h2>`), `<h2 id="${id}">${email}</h2>`);
}

/** @param {string} html */
function postprocessBodyHtml(html) {
  let out = html.replace(
    /<h2>Outside the extension<\/h2>/,
    '<h2 id="scope">Outside the extension</h2>',
  );
  out = addContactHeadingId(out, 'info@airesearchdog.net', 'info');
  out = addContactHeadingId(out, 'help@airesearchdog.net', 'help');
  out = addContactHeadingId(out, 'admin@airesearchdog.net', 'admin');
  return out.replace(/<h2>Related guides<\/h2>/, '<h2 id="related">Related guides</h2>');
}

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Contact — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — contact',
  pagePath: '/extension/contact',
  showGuideNav: false,
  markdown,
  preprocessMarkdown,
  postprocessBodyHtml,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
