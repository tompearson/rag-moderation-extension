#!/usr/bin/env node
/**
 * Render docs/IMPORTANT_AI_GENERATED_ANALYSIS_EXTENSION.md → Universal public/extension/important-ai-generated-analysis.html
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExtensionGuideHtml } from './lib/extension-guide-html.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalDir = resolve(
  process.env.SYNC_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);
const mdPath = join(extRoot, 'docs', 'IMPORTANT_AI_GENERATED_ANALYSIS_EXTENSION.md');
const outDir = join(universalDir, 'public', 'extension');
const outPath = join(outDir, 'important-ai-generated-analysis.html');

const markdown = readFileSync(mdPath, 'utf8');
const html = renderExtensionGuideHtml({
  pageTitle: 'Important — AI-generated analysis — RAG Moderation Assistant',
  footerText: 'RAG Moderation Assistant — AI-generated analysis notice',
  pagePath: '/extension/important-ai-generated-analysis',
  showGuideNav: false,
  markdown,
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, html, 'utf8');
console.log(`Wrote ${outPath}`);
