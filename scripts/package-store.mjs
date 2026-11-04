#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist', 'store');
const ZIP_PATH = path.join(ROOT, 'dist', 'rag-moderation-assistant.zip');

const SECRET_PATTERNS = [
  /\bRAG_SERVICE_SECRET\s*=/,
  /\bGEMINI_API_KEY\s*=/,
  /sk-[a-zA-Z0-9]{20,}/,
];

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

function readIncludeDirs() {
  const listPath = path.join(ROOT, 'packaging', 'store-include.txt');
  const text = fs.readFileSync(listPath, 'utf8');
  return text
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function walkFiles(dir, base = dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full, base));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full));
    }
  }
  return files.sort();
}

function assertNoForbiddenPaths(outDir) {
  const forbidden = ['docs', 'scripts', 'packaging', 'node_modules'];
  for (const name of forbidden) {
    const p = path.join(outDir, name);
    if (fs.existsSync(p)) {
      throw new Error(`Store output must not contain ${name}/`);
    }
  }
}

/**
 * @param {string} raw
 * @returns {string}
 */
function parseReleaseVersion(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (!SEMVER_PATTERN.test(v)) {
    throw new Error(`RELEASE_VERSION must be semver X.Y.Z (got: ${raw})`);
  }
  return v;
}

/**
 * @param {string} manifestPath
 * @param {string} version
 */
function applyReleaseVersionToManifest(manifestPath, version) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const templateVersion = manifest.version;
  manifest.version = version;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  if (templateVersion !== version) {
    console.log(`Manifest version: ${templateVersion} → ${version} (RELEASE_VERSION)`);
  }
}

function validateManifest(outDir) {
  const manifestPath = path.join(outDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json missing at store output root');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const optional = manifest.optional_host_permissions ?? [];
  const devHosts = optional.filter(
    (h) =>
      typeof h === 'string' &&
      (h.includes('127.0.0.1') ||
        h.includes('localhost') ||
        h.includes('moderation-tool-universal.vercel.app')),
  );
  if (devHosts.length) {
    throw new Error(`Store manifest must not include dev hosts: ${devHosts.join(', ')}`);
  }
  for (const size of ['16', '48', '128']) {
    const rel = manifest.icons?.[size];
    if (!rel || !fs.existsSync(path.join(outDir, rel))) {
      throw new Error(`Missing icon ${size}: ${rel}`);
    }
  }
}

function scanForSecrets(outDir) {
  const textExtensions = new Set(['.js', '.html', '.json', '.css', '.mjs']);
  for (const rel of walkFiles(outDir)) {
    const ext = path.extname(rel);
    if (!textExtensions.has(ext)) continue;
    const content = fs.readFileSync(path.join(outDir, rel), 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        throw new Error(`Possible secret pattern in store output: ${rel}`);
      }
    }
  }
}

function writeZip(outDir, zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  execFileSync('zip', ['-r', zipPath, '.'], {
    cwd: outDir,
    stdio: 'inherit',
  });
}

function main() {
  const includeDirs = readIncludeDirs();
  rmrf(OUT_DIR);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.copyFileSync(
    path.join(ROOT, 'packaging', 'manifest.store.json'),
    path.join(OUT_DIR, 'manifest.json'),
  );

  for (const dir of includeDirs) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) {
      throw new Error(`Include path missing: ${dir}`);
    }
    copyDirRecursive(src, path.join(OUT_DIR, dir));
  }

  fs.copyFileSync(
    path.join(ROOT, 'packaging', 'buildConfig.store.js'),
    path.join(OUT_DIR, 'lib', 'buildConfig.js'),
  );

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const releaseVersion = parseReleaseVersion(process.env.RELEASE_VERSION);
  if (releaseVersion) {
    applyReleaseVersionToManifest(manifestPath, releaseVersion);
  }

  assertNoForbiddenPaths(OUT_DIR);
  validateManifest(OUT_DIR);
  scanForSecrets(OUT_DIR);
  writeZip(OUT_DIR, ZIP_PATH);

  const fileCount = walkFiles(OUT_DIR).length;
  console.log(`Store package ready: ${OUT_DIR} (${fileCount} files)`);
  console.log(`Upload ZIP: ${ZIP_PATH}`);
}

main();
