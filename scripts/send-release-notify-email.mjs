#!/usr/bin/env node
/**
 * Send release notification via Resend (GitHub Actions after tag release).
 *
 * Env:
 * - RESEND_API_KEY (required)
 * - GITHUB_REPOSITORY, GITHUB_REF_NAME
 * - RELEASE_NOTIFY_TO (default info@airesearchdog.net)
 * - RELEASE_NOTIFY_FROM (default RAG Moderation Assistant <noreply@airesearchdog.net>)
 * Reads dist/release-sha256.txt from cwd.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildReleaseNotifyContent } from './releaseNotifyContent.mjs';

const DEFAULT_NOTIFY_TO = 'info@airesearchdog.net';
const DEFAULT_NOTIFY_FROM = 'RAG Moderation Assistant <noreply@airesearchdog.net>';

const apiKey = String(process.env.RESEND_API_KEY || '').trim();
if (!apiKey) {
  console.error('RESEND_API_KEY is not set — add it as a GitHub Actions secret on this repo.');
  process.exit(1);
}

const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
const refName = String(process.env.GITHUB_REF_NAME || '').trim();
if (!repo || !refName) {
  console.error('GITHUB_REPOSITORY and GITHUB_REF_NAME are required');
  process.exit(1);
}

const toRaw = String(process.env.RELEASE_NOTIFY_TO || DEFAULT_NOTIFY_TO).trim();
const toList = toRaw
  .split(/[,;]/)
  .map((s) => s.trim())
  .filter((s) => s.includes('@'));
if (toList.length === 0) {
  console.error(`Invalid RELEASE_NOTIFY_TO: ${toRaw}`);
  process.exit(1);
}

const fromAddr = String(process.env.RELEASE_NOTIFY_FROM || DEFAULT_NOTIFY_FROM).trim();

const shaPath = path.join(process.cwd(), 'dist', 'release-sha256.txt');
if (!fs.existsSync(shaPath)) {
  console.error('Missing dist/release-sha256.txt');
  process.exit(1);
}
const zipSha = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];

const { subject, textBody, htmlBody } = buildReleaseNotifyContent({
  repository: repo,
  refName,
  zipSha,
});

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: fromAddr,
    to: toList,
    subject,
    text: textBody,
    html: htmlBody,
  }),
});

const payload = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('[release-notify] Resend error:', res.status, payload);
  process.exit(1);
}

console.log('[release-notify] Sent', { id: payload.id, to: toList, version: refName.replace(/^v/, '') });
