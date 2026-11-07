#!/usr/bin/env node
/**
 * Copy Moderation-Tool-Universal hyperlink + sanitize utilities into extension lib/.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);

/** @type {{ src: string; dest: string }[]} */
const files = [
  { src: join(universalDir, 'utils', 'linkify.js'), dest: join(extRoot, 'lib', 'linkify.js') },
  {
    src: join(universalDir, 'utils', 'sanitizeModerationText.js'),
    dest: join(extRoot, 'lib', 'sanitizeModerationText.js'),
  },
];

if (!existsSync(universalDir)) {
  console.error(
    `sync-moderation-linkify: Universal checkout not found at ${universalDir}\n` +
      'Set SYNC_UNIVERSAL_DIR or clone Moderation-Tool-Universal as a sibling.',
  );
  process.exit(1);
}

const syncedAt = new Date().toISOString().slice(0, 10);

for (const { src, dest } of files) {
  if (!existsSync(src)) {
    console.error(`sync-moderation-linkify: missing ${src}`);
    process.exit(1);
  }
  let body = readFileSync(src, 'utf8');
  const relSrc = src.replace(`${universalDir}/`, 'Moderation-Tool-Universal/');
  const banner =
    `// Vendored from ${relSrc} on ${syncedAt} — refresh with: npm run sync:linkify\n`;
  body = body.replace(/^\/\/ Vendored from[^\n]*\n/, '');
  writeFileSync(dest, banner + body, 'utf8');
  console.log(`Wrote ${dest}`);
}
