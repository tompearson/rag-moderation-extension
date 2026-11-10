#!/usr/bin/env node
/**
 * Package store ZIP, sync public guides (incl. get-latest), deploy Universal to production.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveUniversalDir } from './lib/latestReleaseArtifacts.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolveUniversalDir(extRoot);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

if (!existsSync(universalDir)) {
  console.error(`Missing Moderation-Tool-Universal: ${universalDir}`);
  console.error('Set SYNC_UNIVERSAL_DIR.');
  process.exit(1);
}

console.log('=== package:store (ZIP + metadata + downloads copy) ===\n');
run('npm', ['run', 'package:store'], extRoot);

console.log('\n=== sync:public-guides ===\n');
run('npm', ['run', 'sync:public-guides'], extRoot);

const zipPath = join(universalDir, 'public', 'extension', 'downloads', 'rag-moderation-assistant.zip');
if (!existsSync(zipPath)) {
  console.error(`Expected ZIP at ${zipPath} before deploy`);
  process.exit(1);
}

console.log('\n=== Universal deploy:prod ===\n');
run('npm', ['run', 'deploy:prod'], universalDir);

console.log('\nLive: https://www.airesearchdog.net/extension/get-latest-extension');
