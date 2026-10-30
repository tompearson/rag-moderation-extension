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
 * @param {unknown[]} sources
 * @returns {string}
 */
export function renderRagSourcesHtml(sources) {
  if (!Array.isArray(sources) || !sources.length) {
    return '<p class="muted">No retrieved guidelines returned.</p>';
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
 * @param {unknown} impact
 * @returns {string}
 */
export function renderContextImpactHtml(impact) {
  if (!impact || typeof impact !== 'object') return '';
  const c = /** @type {{ decisionWithoutContext?: string; summary?: string }} */ (impact);
  const parts = [];
  if (c.decisionWithoutContext) {
    parts.push(`<p><strong>Without context:</strong> ${escapeHtml(c.decisionWithoutContext)}</p>`);
  }
  if (c.summary) {
    parts.push(`<p>${escapeHtml(c.summary)}</p>`);
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
