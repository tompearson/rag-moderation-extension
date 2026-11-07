#!/usr/bin/env node
/**
 * Build GitHub Release notes (used by .github/workflows/release.yml).
 *
 * Env: GITHUB_REPOSITORY, GITHUB_REF_NAME; reads dist/release-sha256.txt from cwd.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReleaseNotifyContent } from './releaseNotifyContent.mjs';

const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
const refName = String(process.env.GITHUB_REF_NAME || '').trim();

const shaPath = path.join(process.cwd(), 'dist', 'release-sha256.txt');
if (!fs.existsSync(shaPath)) {
  console.error('Missing dist/release-sha256.txt — run sha256sum on the versioned ZIP first');
  process.exit(1);
}
const zipSha = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];

const { markdownBody } = buildReleaseNotifyContent({
  repository: repo,
  refName,
  zipSha,
});

const outPath = path.join(process.cwd(), 'dist', 'RELEASE_BODY.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, markdownBody, 'utf8');
console.log(`Wrote ${outPath}`);
