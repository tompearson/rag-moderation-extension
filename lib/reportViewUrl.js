/** @typedef {'business' | 'email'} ReportViewLayout */

/** Card-style full report (Universal `layout=email` / email-channel formatter). */
export const DEFAULT_REPORT_VIEW_LAYOUT = /** @type {ReportViewLayout} */ ('email');

export const DEFAULT_PRODUCTION_REPORT_ORIGIN = 'https://www.airesearchdog.net';

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeModerationHistoryId(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  return null;
}

/**
 * @param {string | null | undefined} apiOrigin
 * @returns {string}
 */
export function getReportViewOrigin(apiOrigin) {
  const raw = (apiOrigin || '').trim();
  if (!raw) return DEFAULT_PRODUCTION_REPORT_ORIGIN;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return DEFAULT_PRODUCTION_REPORT_ORIGIN;
    }
    return raw.replace(/\/+$/, '');
  } catch {
    return DEFAULT_PRODUCTION_REPORT_ORIGIN;
  }
}

/**
 * @param {string} pathAndQuery
 * @param {string} viewOrigin
 * @param {ReportViewLayout} layout
 * @returns {string | null}
 */
function viewUrlFromPathQuery(pathAndQuery, viewOrigin, layout) {
  try {
    const u = new URL(pathAndQuery, viewOrigin);
    u.searchParams.set('layout', layout);
    u.searchParams.set('_t', String(Date.now()));
    return `${viewOrigin}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   apiOrigin: string | null | undefined;
 *   moderationHistoryId?: unknown;
 *   moderationReportUrl?: unknown;
 *   layout?: ReportViewLayout;
 * }} opts
 * @returns {string | null}
 */
export function resolveReportViewUrl(opts) {
  const viewOrigin = getReportViewOrigin(opts.apiOrigin);
  const layout =
    opts.layout === 'business' ? 'business' : opts.layout === 'email' ? 'email' : DEFAULT_REPORT_VIEW_LAYOUT;
  const historyId = normalizeModerationHistoryId(opts.moderationHistoryId);
  const stored =
    typeof opts.moderationReportUrl === 'string' ? opts.moderationReportUrl.trim() : '';

  if (stored && stored.includes('get-reports') && stored.includes('action=view')) {
    try {
      const abs =
        stored.startsWith('http://') || stored.startsWith('https://')
          ? stored
          : `${viewOrigin}${stored.startsWith('/') ? '' : '/'}${stored}`;
      const parsed = new URL(abs);
      const pathQuery = `${parsed.pathname}${parsed.search}`;
      const rebuilt = viewUrlFromPathQuery(pathQuery, viewOrigin, layout);
      if (rebuilt) return rebuilt;
    } catch {
      // fall through
    }
  }

  if (historyId) {
    const pathQuery = `/api/get-reports?action=view&id=${encodeURIComponent(historyId)}`;
    return viewUrlFromPathQuery(pathQuery, viewOrigin, layout);
  }

  return null;
}

/**
 * @param {unknown} result
 * @returns {boolean}
 */
export function hasSavedReportForActions(result) {
  if (!result || typeof result !== 'object') return false;
  const r = /** @type {Record<string, unknown>} */ (result);
  if (normalizeModerationHistoryId(r.moderationHistoryId)) return true;
  const url = r.moderationReportUrl;
  if (typeof url === 'string' && url.includes('get-reports') && url.includes('action=view')) {
    return true;
  }
  return false;
}
