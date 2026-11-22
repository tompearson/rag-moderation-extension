#!/usr/bin/env node
/**
 * Embed site key + extension ID allowlist → Universal public/extension/recaptcha-bridge.html
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveUniversalDir } from './lib/latestReleaseArtifacts.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolveUniversalDir(extRoot);
const src = join(extRoot, 'docs', 'static', 'recaptcha-bridge.html');
const idsPath = join(extRoot, 'lib', 'recaptcha-bridge-extension-ids.json');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'recaptcha-bridge.html');

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, 'utf8');
    const out = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
    return out;
  } catch {
    return {};
  }
}

const envLocal = loadEnvFile(join(universalDir, '.env.local'));
function siteKeyFromSyncedBridge(path) {
  if (!existsSync(path)) return '';
  try {
    const html = readFileSync(path, 'utf8');
    const match = html.match(/var SITE_KEY = '([^']+)'/);
    const key = match?.[1]?.trim() || '';
    return key && key !== 'missing-site-key' ? key : '';
  } catch {
    return '';
  }
}

function siteKeyFromGitBridge(universalDir) {
  try {
    const html = execFileSync(
      'git',
      ['show', 'HEAD:public/extension/recaptcha-bridge.html'],
      { cwd: universalDir, encoding: 'utf8' },
    );
    const match = html.match(/var SITE_KEY = '([^']+)'/);
    const key = match?.[1]?.trim() || '';
    return key && key !== 'missing-site-key' ? key : '';
  } catch {
    return '';
  }
}

let siteKey =
  process.env.RECAPTCHA_SITE_KEY ||
  process.env.VITE_RECAPTCHA_SITE_KEY ||
  envLocal.RECAPTCHA_SITE_KEY ||
  envLocal.VITE_RECAPTCHA_SITE_KEY ||
  '';

if (!siteKey) {
  siteKey = siteKeyFromSyncedBridge(outPath) || siteKeyFromGitBridge(universalDir);
}

if (!siteKey) {
  console.error(
    'Missing reCAPTCHA site key. Set RECAPTCHA_SITE_KEY (or VITE_RECAPTCHA_SITE_KEY) in Universal .env.local, ' +
      'or export RECAPTCHA_SITE_KEY before sync.',
  );
  process.exit(1);
}

let allowedIds = [];
try {
  const parsed = JSON.parse(readFileSync(idsPath, 'utf8'));
  if (Array.isArray(parsed)) allowedIds = parsed.filter((id) => typeof id === 'string' && id.trim());
} catch {
  allowedIds = [];
}

const envIds = String(
  process.env.RECAPTCHA_BRIDGE_EXTENSION_IDS || envLocal.RECAPTCHA_BRIDGE_EXTENSION_IDS || '',
)
  .split(/[,;\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const id of envIds) {
  if (!allowedIds.includes(id)) allowedIds.push(id);
}

for (const [key, val] of Object.entries(envLocal)) {
  if (val && !process.env[key]) process.env[key] = val;
}

const { getRecaptchaScriptSrc, useLegacyRecaptchaScript } = await import(
  `file://${join(universalDir, 'server/shared/recaptchaSiteKey.js')}`
);
const useLegacy = useLegacyRecaptchaScript();
const scriptSrc = siteKey ? getRecaptchaScriptSrc(siteKey) : 'https://www.google.com/recaptcha/api.js?render=missing-site-key';

let html = readFileSync(src, 'utf8');
html = html.replaceAll('__RECAPTCHA_SITE_KEY__', siteKey || 'missing-site-key');
html = html.replaceAll('__RECAPTCHA_SCRIPT_SRC__', scriptSrc);
html = html.replaceAll('__RECAPTCHA_USE_LEGACY__', useLegacy ? 'true' : 'false');
html = html.replaceAll('__RECAPTCHA_BRIDGE_EXTENSION_IDS_JSON__', JSON.stringify(allowedIds));

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath} (site key ${siteKey ? 'set' : 'missing'}, ${allowedIds.length} extension id(s))`);
