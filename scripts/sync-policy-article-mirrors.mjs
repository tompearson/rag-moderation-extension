#!/usr/bin/env node
/**
 * Copy agent policy article HTML mirrors + matrix PDFs into Universal public/extension.
 *
 * Sources (first-rag-system):
 *   docs/agent-mirrors/*.html
 *   docs/guides/Nextdoor_Policy_Compliance_Matrix-v{N}.pdf          (public printable)
 *   docs/guides/Nextdoor_Policy_Compliance_Matrix-agent-v{N}.pdf    (agent PDF)
 *
 * Env:
 *   SYNC_UNIVERSAL_DIR — override Universal repo path
 *   SYNC_RAG_REPO — override first-rag-system path
 *   AGENT_MATRIX_VERSION — override version N (default: first-rag-system
 *     data/policy_matrix_versions.json currentPublishedVersion)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const myApps = resolve(extRoot, '..');

function resolveUniversalDir() {
  if (process.env.SYNC_UNIVERSAL_DIR) {
    return resolve(process.env.SYNC_UNIVERSAL_DIR);
  }
  const candidates = [
    join(myApps, 'Moderation-Tool-Universal'),
    join(myApps, 'community-moderation-tool', 'Moderation-Tool-Universal'),
  ];
  const hit = candidates.find((p) => existsSync(join(p, 'package.json')));
  if (!hit) {
    throw new Error(
      `Universal repo not found. Set SYNC_UNIVERSAL_DIR. Tried:\n${candidates.join('\n')}`,
    );
  }
  return hit;
}

function resolveRagRepo() {
  if (process.env.SYNC_RAG_REPO) {
    return resolve(process.env.SYNC_RAG_REPO);
  }
  const candidates = [
    join(myApps, 'first-rag-system'),
    join(myApps, 'community-moderation-tool', 'first-rag-system'),
  ];
  const hit = candidates.find((p) => existsSync(join(p, 'docs', 'agent-mirrors')));
  if (!hit) {
    throw new Error(
      `first-rag-system agent-mirrors not found. Set SYNC_RAG_REPO. Tried:\n${candidates.join('\n')}`,
    );
  }
  return hit;
}

function resolveAgentVersion(ragRepo) {
  if (process.env.AGENT_MATRIX_VERSION) {
    return String(process.env.AGENT_MATRIX_VERSION).trim();
  }
  const versionsPath = join(ragRepo, 'data', 'policy_matrix_versions.json');
  const payload = JSON.parse(readFileSync(versionsPath, 'utf8'));
  const n = payload.currentPublishedVersion ?? payload.buildDefaultVersion;
  if (!n) {
    throw new Error(`No currentPublishedVersion in ${versionsPath}`);
  }
  return String(n);
}

const universalDir = resolveUniversalDir();
const ragRepo = resolveRagRepo();
const agentVersion = resolveAgentVersion(ragRepo);

const mirrorsSrc = join(ragRepo, 'docs', 'agent-mirrors');
const guidesDir = join(ragRepo, 'docs', 'guides');
const publicPdfName = `Nextdoor_Policy_Compliance_Matrix-v${agentVersion}.pdf`;
const agentPdfName = `Nextdoor_Policy_Compliance_Matrix-agent-v${agentVersion}.pdf`;
const publicPdfSrc = join(guidesDir, publicPdfName);
const agentPdfSrc = join(guidesDir, agentPdfName);
const publicPdfAssetDest = join(extRoot, 'docs', 'assets', publicPdfName);
const agentPdfAssetDest = join(extRoot, 'docs', 'assets', agentPdfName);

const outDir = join(universalDir, 'public', 'extension');
const articlesDir = join(outDir, 'policy-articles');
const downloadsDir = join(outDir, 'downloads');
const publicPdfDest = join(downloadsDir, publicPdfName);
const agentPdfDest = join(downloadsDir, agentPdfName);

if (!existsSync(publicPdfSrc)) {
  throw new Error(`Missing public matrix PDF: ${publicPdfSrc}`);
}
if (!existsSync(agentPdfSrc)) {
  throw new Error(`Missing agent PDF: ${agentPdfSrc}`);
}

mkdirSync(articlesDir, { recursive: true });
mkdirSync(downloadsDir, { recursive: true });
mkdirSync(dirname(publicPdfAssetDest), { recursive: true });

copyFileSync(publicPdfSrc, publicPdfAssetDest);
copyFileSync(publicPdfSrc, publicPdfDest);
copyFileSync(agentPdfSrc, agentPdfAssetDest);
copyFileSync(agentPdfSrc, agentPdfDest);

const htmlFiles = readdirSync(mirrorsSrc).filter((name) => name.endsWith('.html'));
if (!htmlFiles.length) {
  throw new Error(`No HTML mirrors in ${mirrorsSrc}`);
}

for (const name of htmlFiles) {
  copyFileSync(join(mirrorsSrc, name), join(articlesDir, name));
}

// Extensionless-friendly index copy already as index.html
writeFileSync(
  join(articlesDir, 'README.txt'),
  [
    'Plain HTML policy article mirrors for chat tools / agents.',
    'Agent matrix (HTML): /extension/policy-articles/Nextdoor_Policy_Compliance_Matrix-agent.html',
    `Public matrix PDF: /extension/downloads/Nextdoor_Policy_Compliance_Matrix-v${agentVersion}.pdf`,
    `Agent PDF: /extension/downloads/Nextdoor_Policy_Compliance_Matrix-agent-v${agentVersion}.pdf`,
    'Built from first-rag-system docs/agent-mirrors/ + docs/guides/',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Wrote ${htmlFiles.length} HTML files -> ${articlesDir}`);
console.log(`Wrote ${publicPdfDest}`);
console.log(`Wrote ${publicPdfAssetDest}`);
console.log(`Wrote ${agentPdfDest}`);
console.log(`Wrote ${agentPdfAssetDest}`);
