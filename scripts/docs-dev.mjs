#!/usr/bin/env node
/**
 * Sync extension public guides into Moderation-Tool-Universal, then print local preview URLs.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, '..');

const BASE = 'http://127.0.0.1:3000';

/** Same slugs as Moderation-Tool-Universal vercel.json redirects for /extension/*. */
const EXTENSION_PATHS = [
  '/extension/get-gemini-api-key',
  '/extension/install-chrome-extension',
  '/extension/install-chrome-extension-developer',
  '/extension/privacy',
  '/extension/terms',
  '/extension/important-ai-generated-analysis',
  '/extension/how-to-moderate-user-posts',
  '/extension/how-to-test-extension',
  '/extension/visual-moderation-step-by-step',
  '/extension/contact',
];

const openBrowser = process.argv.includes('--open');

function runSync() {
  const r = spawnSync('npm', ['run', 'sync:public-guides'], {
    cwd: extRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function tryOpenUrl(url) {
  const platform = process.platform;
  let cmd;
  let args;
  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }
  const r = spawnSync(cmd, args, { stdio: 'ignore' });
  if (r.error) {
    console.warn(`Could not open browser (${cmd}): ${r.error.message}`);
  }
}

runSync();

console.log('\nSynced guides into Universal public/extension/ (see SYNC_UNIVERSAL_DIR if not default sibling).');
console.log('\nStart the Vite dev server in Moderation-Tool-Universal:');
console.log('  cd ../community-moderation-tool/Moderation-Tool-Universal  # or your path');
console.log('  npm run dev\n');
console.log('Then open (clean URLs, same as production):\n');
for (const p of EXTENSION_PATHS) {
  console.log(`  ${BASE}${p}`);
}
console.log('\nDetails: docs/DEV_WEB_DOCS.md\n');

if (openBrowser) {
  tryOpenUrl(`${BASE}/extension/how-to-test-extension`);
}
