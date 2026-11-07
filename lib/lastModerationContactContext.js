import { resolveReportViewUrl } from './reportViewUrl.js';

export const LAST_MODERATION_CONTACT_SESSION_KEY = 'lastModerationContactContext';

const MAX_CONTACT_MESSAGE_LEN = 8000;

/**
 * @typedef {{
 *   moderationHistoryId: string | null;
 *   moderationReportUrl: string | null;
 *   apiOrigin: string | null;
 *   decision: string | null;
 *   provider: string | null;
 *   analysisType: string | null;
 *   viewUrl: string | null;
 * }} LastModerationContactContext
 */

/**
 * @param {Record<string, unknown>} result
 * @param {string | null | undefined} apiOrigin
 * @param {string | null} moderationHistoryId
 * @param {string | null} moderationReportUrl
 * @param {string | null} provider
 * @param {string | null} analysisType
 */
export async function persistLastModerationContactContext(
  result,
  apiOrigin,
  moderationHistoryId,
  moderationReportUrl,
  provider,
  analysisType,
) {
  const viewUrl = resolveReportViewUrl({
    apiOrigin,
    moderationHistoryId,
    moderationReportUrl,
  });
  if (!moderationHistoryId && !viewUrl && !moderationReportUrl) return;

  /** @type {LastModerationContactContext} */
  const payload = {
    moderationHistoryId: moderationHistoryId || null,
    moderationReportUrl: moderationReportUrl || null,
    apiOrigin: apiOrigin || null,
    decision:
      typeof result.decision === 'string' && result.decision.trim()
        ? result.decision.trim()
        : null,
    provider: provider || null,
    analysisType: analysisType || null,
    viewUrl,
  };
  await chrome.storage.session.set({ [LAST_MODERATION_CONTACT_SESSION_KEY]: payload });
}

/**
 * @returns {Promise<LastModerationContactContext | null>}
 */
export async function loadLastModerationContactContext() {
  const data = await chrome.storage.session.get(LAST_MODERATION_CONTACT_SESSION_KEY);
  const raw = data[LAST_MODERATION_CONTACT_SESSION_KEY];
  if (!raw || typeof raw !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const moderationHistoryId =
    typeof o.moderationHistoryId === 'string' && o.moderationHistoryId.trim()
      ? o.moderationHistoryId.trim()
      : null;
  const viewUrl =
    typeof o.viewUrl === 'string' && o.viewUrl.trim() ? o.viewUrl.trim() : null;
  const moderationReportUrl =
    typeof o.moderationReportUrl === 'string' && o.moderationReportUrl.trim()
      ? o.moderationReportUrl.trim()
      : null;
  if (!moderationHistoryId && !viewUrl && !moderationReportUrl) return null;
  return {
    moderationHistoryId,
    moderationReportUrl,
    apiOrigin: typeof o.apiOrigin === 'string' ? o.apiOrigin : null,
    decision: typeof o.decision === 'string' ? o.decision : null,
    provider: typeof o.provider === 'string' ? o.provider : null,
    analysisType: typeof o.analysisType === 'string' ? o.analysisType : null,
    viewUrl,
  };
}

/**
 * @param {LastModerationContactContext | null} ctx
 * @returns {string}
 */
export function formatLastReportContactAppendix(ctx) {
  if (!ctx) return '';
  const lines = ['', '---', 'Last moderation report (context):'];
  let hasDetail = false;
  if (ctx.moderationHistoryId) {
    lines.push(`Report ID: ${ctx.moderationHistoryId}`);
    hasDetail = true;
  }
  if (ctx.decision) {
    lines.push(`Decision: ${ctx.decision}`);
    hasDetail = true;
  }
  if (ctx.provider) {
    lines.push(`Provider: ${ctx.provider}`);
    hasDetail = true;
  }
  if (ctx.analysisType) {
    lines.push(`Analysis: ${ctx.analysisType}`);
    hasDetail = true;
  }
  const url = ctx.viewUrl || ctx.moderationReportUrl;
  if (url) {
    lines.push(`Full report: ${url}`);
    hasDetail = true;
  }
  if (!hasDetail) return '';
  return lines.join('\n');
}

/**
 * Appends last-report context for Help when a saved report exists (not shown in the textarea).
 *
 * @param {string} userMessage
 * @param {number} [maxLen]
 * @returns {Promise<string>}
 */
export async function appendLastReportToContactMessage(
  userMessage,
  maxLen = MAX_CONTACT_MESSAGE_LEN,
) {
  const trimmed = String(userMessage || '').trim();
  const ctx = await loadLastModerationContactContext();
  const appendix = formatLastReportContactAppendix(ctx);
  if (!appendix) return trimmed;
  const combined = `${trimmed}${appendix}`;
  if (combined.length <= maxLen) return combined;
  const budget = maxLen - appendix.length;
  if (budget < 1) return combined.slice(0, maxLen);
  const head = trimmed.slice(0, budget).trimEnd();
  return head ? `${head}${appendix}` : appendix.slice(0, maxLen);
}
