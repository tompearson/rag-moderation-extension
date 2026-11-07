import { linkifyUrls } from './linkify.js';
import { sanitizeModerationText } from './sanitizeModerationText.js';

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function moderationTextForDisplay(raw) {
  const s = sanitizeModerationText(String(raw ?? ''));
  return s == null ? '' : String(s);
}

/**
 * Safe HTML for Reason, Breakdown, etc. (markdown links → anchors).
 * @param {unknown} raw
 * @returns {string}
 */
export function moderationTextToLinkedHtml(raw) {
  return linkifyUrls(moderationTextForDisplay(raw));
}

/**
 * Plain text for clipboard (link label only, no markdown syntax).
 * @param {unknown} raw
 * @returns {string}
 */
export function stripMarkdownLinksToPlainText(raw) {
  const cleaned = moderationTextForDisplay(raw);
  if (!cleaned) return '';
  return cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
}
