#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist', 'store');
const ZIP_PATH = path.join(ROOT, 'dist', 'rag-moderation-assistant.zip');

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

function sha256(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function main() {
  if (!fs.existsSync(OUT_DIR)) {
    throw new Error(`Missing ${OUT_DIR} — run npm run package:store first`);
  }
  if (!fs.existsSync(ZIP_PATH)) {
    throw new Error(`Missing ${ZIP_PATH} — run npm run package:store first`);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-mod-store-zip-'));
  try {
    execFileSync('unzip', ['-q', ZIP_PATH, '-d', tmp], { stdio: 'inherit' });

    const dirFiles = walkFiles(OUT_DIR);
    const zipFiles = walkFiles(tmp);

    if (dirFiles.length !== zipFiles.length) {
      throw new Error(
        `File count mismatch: dist/store=${dirFiles.length}, zip=${zipFiles.length}`,
      );
    }

    for (let i = 0; i < dirFiles.length; i += 1) {
      const rel = dirFiles[i];
      if (rel !== zipFiles[i]) {
        throw new Error(`Path mismatch at index ${i}: ${rel} vs ${zipFiles[i]}`);
      }
      const a = sha256(path.join(OUT_DIR, rel));
      const b = sha256(path.join(tmp, rel));
      if (a !== b) {
        throw new Error(`Content mismatch: ${rel}`);
      }
    }

    console.log(`ZIP matches dist/store/ (${dirFiles.length} files).`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main();
