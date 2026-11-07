// Vendored from Moderation-Tool-Universal/utils/sanitizeModerationText.js on 2026-11-07 — refresh with: npm run sync:linkify
import { repairNestedMarkdownLinks } from './linkify.js';

/**
 * Sanitize moderation text (reason, decisionBreakdown, suggestedRevision, etc.)
 * Used by reportFormatter, reportFormatter-business, and sendReportEmail.
 *
 * - Unescapes JSON-style escapes (\. \n \r \t \" \\)
 * - Strips AI JSON leaks (inline and end-of-string), e.g. ", decisionBreakdown": "more text..."
 * - Strips truncated quote artifact: trailing ,\
 * - Cleans trailing double periods (AI sometimes adds multiple periods)
 * - Repairs truncated Nextdoor "Wanted or ISO" markdown (see V28 policy_urls) when the model cuts off mid-link
 *
 * @param {string|null|undefined} value
 * @returns {string|null|undefined}
 */
const CANONICAL_WANTED_ISO_MARKDOWN =
  '[Wanted or ISO (in search of) guidelines](https://help.nextdoor.com/s/article/Wanted-or-ISO-in-search-of-posts?language=en_US)';

/** Well-formed Wanted/ISO markdown already present — do not run truncated repair (avoids duplicating link tail). */
const COMPLETE_WANTED_ISO_MARKDOWN =
  /\[Wanted or ISO \(in search of\)[^\]]*\]\([^)]*Wanted-or-ISO-in-search-of-posts[^)]*\)/i;

/** Visible/report repair only — matches \[ or [ + truncated/malformed Wanted/ISO anchor text per production prompt. */
export function repairTruncatedWantedIsoMarkdown(text) {
  if (text == null || typeof text !== 'string') return text;
  if (COMPLETE_WANTED_ISO_MARKDOWN.test(text)) return text;
  return text.replace(
    /\\?\[Wanted or ISO \(in search of\)(?:\s+guidelines)?\s*(?:\]\([^)]*\))?[\s.)]*/gi,
    CANONICAL_WANTED_ISO_MARKDOWN,
  );
}

/**
 * Strip internal moderation taxonomy that must not appear in neighbor-facing text.
 * e.g. "non-bird pet" → "pet" (birds vs non-bird is prompt-internal only).
 * e.g. "in-app Housing path" / "(or Housing)" → For Sale & Free only.
 */
export function stripInternalModerationJargon(text) {
  if (text == null || typeof text !== 'string') return text;
  let result = text;
  result = result.replace(/\bnon[- ]bird pets\b/gi, 'pets');
  result = result.replace(/\bnon[- ]bird pet\b/gi, 'pet');
  result = result.replace(/\bnon[- ]bird rehoming\b/gi, 'pet rehoming');
  result = result.replace(/\ba non[- ]bird\b/gi, 'a pet');
  result = result.replace(/\bnon[- ]bird\b(?=\s+(?:pet|pets|rehoming)\b)/gi, '');
  result = result.replace(/\bnon[- ]bird\b/gi, 'pet');
  // Rental placement: never surface "Housing path" — For Sale & Free only.
  result = result.replace(/\s*[,;]?\s*or the in-app Housing path\b/gi, '');
  result = result.replace(/\s*[,;]?\s*or the Housing path\b/gi, '');
  result = result.replace(/\s*[,;]?\s*the in-app Housing path\b/gi, '');
  result = result.replace(/\s*\(or Housing\)/gi, '');
  result = result.replace(/\bFor Sale &\s*Free or Housing\b/gi, 'For Sale & Free');
  result = result.replace(/\bFor Sale and Free or Housing\b/gi, 'For Sale and Free');
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/\s+([.,;:])/g, '$1');
  return result;
}

/** When Reason is only leaked JSON (e.g. `, decisionBreakdown": "…"`), recover the quoted prose. */
function salvageQuotedValuesFromJsonLeaks(text) {
  const chunks = [];
  const re = /,\s*(?:")?[a-zA-Z_-]+"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const v = m[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .trim();
    if (v) chunks.push(v);
  }
  return chunks.join(' ').trim();
}

/**
 * Reason for reports: sanitize + fall back to decision breakdown when Reason was emptied by JSON-leak stripping.
 */
export function resolveReasonForDisplay(moderationResult) {
  const raw = moderationResult?.reason ?? '';
  let reason = (
    stripRedundantReasonLanguageSuffix(sanitizeModerationText(String(raw))) || ''
  ).trim();

  if (!reason) {
    const bd = moderationResult?.decisionBreakdown || moderationResult?.['decision-breakdown'];
    if (bd && String(bd).trim()) {
      const cleanBd = (sanitizeModerationText(String(bd).trim()) || '').trim();
      const firstSentence = cleanBd.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim();
      reason = firstSentence || cleanBd.slice(0, 500).trim();
    }
  }

  return reason || 'No reason provided.';
}

/** Model sometimes leaves a stray letter after ](url) before punctuation (e.g. "...Safety](url)s."). */
function repairStrayLetterAfterMarkdownLink(text) {
  if (text == null || typeof text !== 'string') return text;
  return text.replace(
    /\]\((https?:\/\/[^)\s]+)\)s([.,!?;:])/gi,
    ']($1)$2',
  );
}

export function sanitizeModerationText(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const originalAfterUnescape = value
    .replace(/\\\./g, '.')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  let result = originalAfterUnescape;
  // Strip AI JSON leaks: the model sometimes appends the next JSON field into Reason/other text.
  // Match both `, decisionBreakdown": "…"` and `, "decisionBreakdown": "…"`. Do not require end
  // of string — trailing keys (e.g. SuggestedRevision) or copy-paste noise often follows.
  const jsonFieldLeak =
    /,\s*(?:")?[a-zA-Z_-]+"\s*:\s*"(?:[^"\\]|\\.)*"?/g;
  let prev;
  do {
    prev = result;
    result = result.replace(jsonFieldLeak, '').trim();
  } while (result !== prev);

  // Reason field sometimes IS only `, decisionBreakdown": "…"` — stripping removed the prose entirely.
  if (!result.trim() && originalAfterUnescape.trim()) {
    const salvaged = salvageQuotedValuesFromJsonLeaks(originalAfterUnescape);
    if (salvaged) result = salvaged;
  }

  // Quoted keys with spaces (e.g. , "Location Meta": "Ohio") — skipped by pattern above.
  const jsonQuotedKeyStringLeak = /,\s*"[^"]+"\s*:\s*"(?:[^"\\]|\\.)*"?/g;
  do {
    prev = result;
    result = result.replace(jsonQuotedKeyStringLeak, '').trim();
  } while (result !== prev);
  // Trailing object leaks: , "report-category": { "mainCategory": "…" (often incomplete / no closing })
  result = result
    .replace(/,\s*(?:\r?\n\s*)*"report-category"\s*:\s*\{[\s\S]*$/i, '')
    .trim();
  // Orphan lines after a partial object: "mainCategory": "disrespectful"
  result = result
    .replace(/(?:^|\r?\n)\s*"(?:mainCategory|subCategory)"\s*:\s*"(?:[^"\\]|\\.)*"?/gi, '')
    .trim();
  // Strip truncated quote artifact: regex extraction bug left "friends,\" as "friends,\" - remove trailing ,\
  result = result.replace(/,\\+$/g, '').trim();
  // Clean trailing double periods (AI sometimes adds multiple periods)
  result = result.replace(/\.\.+$/g, '.').replace(/\.\s+\.+$/g, '.').trim();
  result = repairTruncatedWantedIsoMarkdown(result);
  result = repairNestedMarkdownLinks(result);
  result = repairStrayLetterAfterMarkdownLink(result);
  result = stripInternalModerationJargon(result);
  return result;
}

/**
 * Normalize Reason text for display:
 * - Always strip a trailing `(English)` tag (any case). English is the default UI language;
 *   we still show `(Spanish)`, `(Chinese)`, etc.
 * - If Reason ends with ` (Language)` and that language name already appears in the prose
 *   (e.g. "written in Chinese ... (Chinese)"), drop the redundant suffix.
 *
 * @param {string|null|undefined} reason
 * @returns {string|null|undefined}
 */
export function stripRedundantReasonLanguageSuffix(reason) {
  if (reason == null || typeof reason !== 'string') return reason;
  let working = reason.trimEnd();
  working = working.replace(/\s*\(\s*English\s*\)\s*$/i, '').trimEnd();

  const trimmed = working.trimEnd();
  const m = trimmed.match(/^([\s\S]+?)\s+\(([^)]+)\)\s*$/);
  if (!m) return working;
  const body = m[1].trimEnd();
  const lang = m[2].trim();
  if (!lang) return working;
  const parts = lang.split(/\s+/).filter(Boolean);
  const escaped = parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern =
    escaped.length === 1
      ? new RegExp(`\\b${escaped[0]}\\b`, 'i')
      : new RegExp(`\\b${escaped.join('\\s+')}\\b`, 'i');
  if (pattern.test(body)) return body;
  return working;
}
