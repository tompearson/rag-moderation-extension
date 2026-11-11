import { moderationTextToLinkedHtml } from './moderationLinkedHtml.js';

/**
 * @param {string} decision
 * @returns {string}
 */
export function decisionClass(decision) {
  const d = (decision || '').toLowerCase();
  if (d === 'keep') return 'decision-keep';
  if (d === 'remove') return 'decision-remove';
  if (d.includes('maybe')) return 'decision-maybe';
  if (d === 'error') return 'decision-error';
  return 'decision-default';
}

/**
 * @param {unknown} category
 * @returns {string}
 */
export function formatReportCategory(category) {
  if (!category || typeof category !== 'object') return '';
  const c = /** @type {{ mainCategory?: string; subCategory?: string }} */ (category);
  const parts = [c.mainCategory, c.subCategory].filter(Boolean);
  return parts.join(' / ');
}

/**
 * @param {{ moderationMode?: unknown }} [options]
 * @returns {boolean}
 */
export function isRagModerationResult(options = {}) {
  const mode = String(options.moderationMode ?? '').trim().toLowerCase();
  if (mode === 'rag') return true;
  if (mode === 'full_prompt') return false;
  return false;
}

/**
 * @param {unknown[]} sources
 * @param {{ moderationMode?: unknown }} [options]
 * @returns {string}
 */
export function renderRagSourcesHtml(sources, options = {}) {
  if (!Array.isArray(sources) || !sources.length) {
    if (!isRagModerationResult(options)) {
      return '<p class="muted">Guideline snippets are not retrieved for the <strong>no RAG</strong> provider. In Options → <strong>Platform intelligence</strong>, choose <strong>Nextdoor V28.0.114 (RAG)</strong> and run <strong>Moderate</strong> again.</p>';
    }
    return '<p class="muted">No retrieved guidelines were returned for this run. The decision still used the RAG prompt; if this keeps happening, check that your API profile can reach the RAG service.</p>';
  }
  return sources
    .map((item) => {
      const s = /** @type {{ title?: string; source?: string; preview?: string }} */ (item);
      const title = escapeHtml(s.title || 'Guideline');
      const href = s.source ? escapeHtml(s.source) : '';
      const preview = escapeHtml((s.preview || '').slice(0, 240));
      const link = href
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${title}</a>`
        : title;
      return `<li>${link}${preview ? `<div class="source-preview">${preview}</div>` : ''}</li>`;
    })
    .join('');
}

/**
 * Collapsible Retrieved guidelines block (collapsed by default).
 * Hidden when moderation used the full-prompt (non-RAG) provider.
 * @param {unknown[]} sources
 * @param {{ moderationMode?: unknown }} [options]
 * @returns {string}
 */
export function renderRagSourcesFoldHtml(sources, options = {}) {
  if (!isRagModerationResult(options)) {
    return '';
  }
  const count = Array.isArray(sources) ? sources.length : 0;
  const summary =
    count > 0 ? `Retrieved guidelines (${count})` : 'Retrieved guidelines';
  const body =
    count > 0
      ? `<ul>${renderRagSourcesHtml(sources, options)}</ul>`
      : renderRagSourcesHtml(sources, options);
  return `<details class="rag-sources-fold"><summary>${escapeHtml(summary)}</summary>${body}</details>`;
}

/** Public page (Important — AI-generated analysis); matches extension guide wording. */
const IMPORTANT_AI_GENERATED_ANALYSIS_URL =
  'https://www.airesearchdog.net/extension/important-ai-generated-analysis.html';

/**
 * Gemini-style disclaimer + link, shown directly under Retrieved guidelines in results.
 * @returns {string}
 */
export function renderGeminiAiDisclaimerAfterRagHtml() {
  const href = escapeHtml(IMPORTANT_AI_GENERATED_ANALYSIS_URL);
  return `<p class="muted rag-ai-notice">Gemini can make mistakes. <a href="${href}" target="_blank" rel="noopener noreferrer">Check your results</a></p>`;
}

/**
 * @param {unknown} impact
 * @returns {string}
 */
export function renderContextImpactHtml(impact) {
  if (!impact || typeof impact !== 'object') return '';
  const c = /** @type {{ decisionWithoutContext?: string; summary?: string }} */ (impact);
  const parts = [];
  if (c.decisionWithoutContext) {
    parts.push(
      `<p class="moderation-linked-prose"><strong>Without context:</strong> ${moderationTextToLinkedHtml(c.decisionWithoutContext)}</p>`,
    );
  }
  if (c.summary) {
    parts.push(`<p class="moderation-linked-prose">${moderationTextToLinkedHtml(c.summary)}</p>`);
  }
  if (!parts.length) return '';
  return `<section class="context-impact"><h3>Context impact</h3>${parts.join('')}</section>`;
}

/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
