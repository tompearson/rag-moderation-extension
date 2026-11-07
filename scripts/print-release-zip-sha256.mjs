#!/usr/bin/env node
/**
 * Print SHA256 for the store ZIP (local builds; CI uses sha256sum in release.yml).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const zipArg = process.argv[2];
const zipPath = zipArg
  ? path.resolve(process.cwd(), zipArg)
  : path.join(ROOT, 'dist', 'rag-moderation-assistant.zip');

if (!fs.existsSync(zipPath)) {
  console.error(`Missing ZIP: ${zipPath} — run npm run package:store first`);
  process.exit(1);
}

const hash = crypto.createHash('sha256');
hash.update(fs.readFileSync(zipPath));
const hex = hash.digest('hex');
const base = path.basename(zipPath);
console.log(`${hex}  ${base}`);
console.log(`\nVerify: sha256sum ${base}`);
