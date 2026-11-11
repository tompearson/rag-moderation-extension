#!/usr/bin/env node
/**
 * Copy borderless invite sample preview → Universal public/extension/invite-sample-report.html
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveUniversalDir } from './lib/latestReleaseArtifacts.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolveUniversalDir(extRoot);
const src = join(extRoot, 'docs', 'static', 'invite-sample-report-preview.html');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'invite-sample-report.html');

mkdirSync(outDir, { recursive: true });
copyFileSync(src, outPath);
console.log(`Wrote ${outPath}`);
