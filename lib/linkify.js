// Vendored from Moderation-Tool-Universal/utils/linkify.js on 2026-11-07 — refresh with: npm run sync:linkify
/**
 * Linkify URLs in text for safe HTML output (email, reports).
 * Converts markdown [text](url) and plain URLs to clickable anchors.
 * Escapes content for XSS safety; drops or repairs invalid http(s) URLs.
 */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ZWSP = '\u200b';

/**
 * HTML-escape user-submitted post body and discourage clickable bare URLs in email and report HTML.
 * Does not emit `<a>` tags; inserts U+200B after common URL schemes so many clients skip auto-linkification.
 */
export function escapeUserSubmittedPostContentHtml(raw) {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  let e = escapeHtml(trimmed);
  e = e.replace(/(https?:\/\/)/gi, `$1${ZWSP}`);
  e = e.replace(/(ftp:\/\/)/gi, `$1${ZWSP}`);
  e = e.replace(/(^|[\s(])(www\.)/gi, `$1${ZWSP}$2`);
  e = e.replace(/(mailto:)/gi, `$1${ZWSP}`);
  return e;
}

function stripOptionalAngleBrackets(url) {
  let t = String(url).trim();
  if (t.startsWith('<') && t.endsWith('>')) t = t.slice(1, -1).trim();
  return t;
}

/** AI often truncates Nextdoor help links (invalid host or article path). */
function repairTruncatedNextdoorHelp(trimmed) {
  const u = trimmed.trim();
  if (/^https?:\/\/help\.nextdoor\.?$/i.test(u)) return 'https://help.nextdoor.com/';
  if (/^https?:\/\/help\.nextdoor$/i.test(u)) return 'https://help.nextdoor.com/';
  if (/^https?:\/\/help\.nextdoor\.com\/s\/article\/[^/?#]+\?$/i.test(u)) {
    return u.slice(0, -1);
  }
  return trimmed;
}

function mdLinkReplace(linkText, urlRaw) {
  const href = escapeHref(urlRaw);
  if (!href) return escapeHtml(`[${linkText}](${urlRaw})`);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${LINK_STYLE}">${escapeHtml(linkText)}</a>`;
}

/**
 * Return URL safe for use in an href attribute, or '' if not a usable http(s) URL.
 * Exported for formatters that run their own markdown step first.
 */
export function escapeHref(url) {
  if (!url || typeof url !== 'string') return '';
  let trimmed = stripOptionalAngleBrackets(url).trim();
  trimmed = trimmed.replace(/^&lt;\s*/, '').replace(/\s*&gt;$/, '').trim();
  trimmed = repairTruncatedNextdoorHelp(trimmed);
  if (!/^https?:\/\//i.test(trimmed)) return '';

  let safeUrl;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (u.hostname.endsWith('.')) return '';
    if (!u.hostname.includes('.') && u.hostname !== 'localhost') return '';
    safeUrl = u.href;
  } catch {
    return '';
  }

  return safeUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '')
    .replace(/>/g, '');
}

const LINK_STYLE = 'color: #007bff; text-decoration: underline;';

/** Markdown `[text](url)` with optional backslash escapes (AI JSON output). */
const MARKDOWN_LINK_PATTERN = /\\?\[([^\]]+)\]\\?\(([^)\s]+)\)/g;

/**
 * Normalize a markdown link target for duplicate detection (http/https only).
 * Decodes percent-encoding so `language=en_US` and `language=en%5FUS` match.
 *
 * @param {string} url
 * @returns {string}
 */
export function normalizeMarkdownLinkTarget(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = stripOptionalAngleBrackets(url).trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return trimmed;
    const params = new URLSearchParams(u.search);
    const normalizedParams = new URLSearchParams();
    for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      normalizedParams.append(key, decodeURIComponent(value));
    }
    const search = normalizedParams.toString();
    const pathname = decodeURIComponent(u.pathname).replace(/\/$/, '') || '/';
    return `${u.protocol}//${u.host}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return trimmed;
  }
}

/**
 * Keep the first markdown link per URL; convert later duplicates to plain anchor text.
 * Used on decisionBreakdown so each help.nextdoor.com URL appears at most once as a link.
 *
 * @param {string|null|undefined} text
 * @returns {string|null|undefined}
 */
export function dedupeMarkdownLinkTargets(text) {
  if (text == null || typeof text !== 'string') return text;
  const seen = new Set();
  return text.replace(MARKDOWN_LINK_PATTERN, (match, linkText, urlRaw) => {
    const key = normalizeMarkdownLinkTarget(urlRaw);
    if (!key) return match;
    if (seen.has(key)) return linkText;
    seen.add(key);
    return match;
  });
}

/**
 * Repair AI nested / double-wrapped markdown before linkify.
 * e.g. [Best practices [For Sale & Free](url)]([url](url)) → [Best practices For Sale & Free](url)
 */
export function repairNestedMarkdownLinks(text) {
  if (text == null || typeof text !== 'string') return text;
  let result = text;
  let prev;

  const nestedDoubleWrap =
    /\[([^\[]*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)\]\(\[?(https?:\/\/[^)\s]+)\]?\((https?:\/\/[^)]+)\)\)/gi;

  do {
    prev = result;
    result = result.replace(nestedDoubleWrap, (_, before, inner, url) => {
      const label = `${before}${inner}`.replace(/\s+/g, ' ').trim();
      return `[${label}](${url})`;
    });
  } while (result !== prev);

  // [outer [inner](url)](anything) — broken outer paren not double-markdown
  do {
    prev = result;
    result = result.replace(
      /\[([^\[]*?)\[([^\]]+)\]\((https?:\/\/[^)]+)\)\]\(([^)]*)\)/gi,
      (_, before, inner, url) => {
        const label = `${before}${inner}`.replace(/\s+/g, ' ').trim();
        return `[${label}](${url})`;
      },
    );
  } while (result !== prev);

  // Standalone ]([url](url)) tail
  result = result.replace(
    /\]\(\[(https?:\/\/[^)\s]+)\]\((https?:\/\/[^)]+)\)\)/gi,
    ']($2)',
  );

  return result;
}

/**
 * Convert markdown links and plain URLs to clickable HTML anchors.
 *
 * @param {string} text - Text that may contain [text](url) or plain URLs
 * @returns {string} HTML with clickable links
 */
export function linkifyUrls(text) {
  if (!text) return '';
  let result = repairNestedMarkdownLinks(dedupeMarkdownLinkTargets(String(text)) ?? String(text))
    // Markdown sometimes escapes brackets/parens (e.g. \[label\](url))
    .replace(/\\([\[\]()])/g, '$1');

  result = result
    .replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, (_, linkText, url) => mdLinkReplace(linkText, url))
    // Well-formed [text](url) — closing )
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, linkText, url) => mdLinkReplace(linkText, url))
    // Truncated AI markdown: [text](https://... with no closing ) before space, quote, comma, ], or end
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s"'<>]+)(?=["\s,;\]]|$)/g,
      (_, linkText, url) => mdLinkReplace(linkText, url),
    );

  // AI often omits space after closing ); separate a following word from the anchor in HTML/email
  result = result.replace(/(<\/a>)(?=\p{L})/gu, '$1 ');

  const linkRegex = /<a[^>]*>[\s\S]*?<\/a>/g;
  const linkPositions = [];
  let linkMatch;
  while ((linkMatch = linkRegex.exec(result)) !== null) {
    linkPositions.push({
      start: linkMatch.index,
      end: linkMatch.index + linkMatch[0].length,
      html: linkMatch[0],
    });
  }

  const plainUrlRegex = /(https?:\/\/[^\s\)]+?)(?=[.,;:]?\s|[.,;:]?\)|$)/g;
  const processSegment = (segment) => {
    if (!segment) return '';
    const parts = segment.split(plainUrlRegex);
    return parts
      .map((part) => {
        if (/^https?:\/\//i.test(part)) {
          const href = escapeHref(part);
          if (!href) return escapeHtml(part);
          return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${LINK_STYLE}">${escapeHtml(part)}</a>`;
        }
        return escapeHtml(part);
      })
      .join('');
  };

  if (linkPositions.length === 0) {
    return processSegment(result);
  }

  const parts = [];
  let currentPos = 0;
  for (const link of linkPositions) {
    if (link.start > currentPos) {
      parts.push(processSegment(result.substring(currentPos, link.start)));
    }
    parts.push(link.html);
    currentPos = link.end;
  }
  if (currentPos < result.length) {
    parts.push(processSegment(result.substring(currentPos)));
  }
  // Model typo: ](url)s. → markdown ends at first ); linkify leaves a stray " s." after </a>
  return parts.join('').replace(/(<\/a>)\s*s(?=[.,!?;:])/gi, '$1');
}
