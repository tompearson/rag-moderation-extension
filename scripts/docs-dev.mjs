#!/usr/bin/env node
/**
 * Sync extension public guides into Moderation-Tool-Universal, then print or serve preview URLs.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { freePort } from './dev-ports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extRoot = resolve(__dirname, '..');

const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    process.env.DEV_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);

const BASE = 'http://127.0.0.1:3000';
const GUIDES_PORT = 3000;

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
const serve = process.argv.includes('--serve');

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

function requireUniversal() {
  if (!existsSync(universalDir)) {
    console.error(`Missing Moderation-Tool-Universal: ${universalDir}`);
    console.error('Set SYNC_UNIVERSAL_DIR or DEV_UNIVERSAL_DIR.');
    process.exit(1);
  }
}

function startViteGuides() {
  requireUniversal();
  freePort(GUIDES_PORT);
  const npmArgs = ['run', 'dev:extension-guides'];
  if (!openBrowser) {
    // dev:extension-guides always passes --open; use bare vite when not opening browser
    npmArgs.length = 0;
    npmArgs.push('exec', 'vite', '--', '--host', '127.0.0.1', '--port', String(GUIDES_PORT));
  }
  console.log(`\nVite guides: ${universalDir} → ${BASE}/extension/...\n`);
  const child = spawn('npm', npmArgs, {
    cwd: universalDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => child.kill('SIGTERM'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
}

runSync();

console.log('\nSynced guides into Universal public/extension/ (see SYNC_UNIVERSAL_DIR if not default sibling).');

if (serve) {
  startViteGuides();
} else {
  console.log('\nStart the Vite guide server (port 3000 — not the API on 3001):');
  console.log('  npm run docs:dev:serve   # from this repo (sync + Vite)');
  console.log('  # or in Universal: npm run dev:extension-guides\n');
  console.log('Then open (clean URLs, same as production):\n');
  for (const p of EXTENSION_PATHS) {
    console.log(`  ${BASE}${p}`);
  }
  console.log('\nExtension API stack (moderate locally): npm run dev  →  :8000 RAG, :3001 API');
  console.log('Details: docs/DEV_WEB_DOCS.md\n');

  if (openBrowser) {
    console.warn(
      'Note: --open without --serve only opens if Vite is already running on :3000.\n',
    );
    tryOpenUrl(`${BASE}/extension/how-to-test-extension`);
  }
}
