/** Nextdoor post title / primary text (e.g. Linkify spans). Keep in sync with content/pickMode.js heuristics. */

import {
  extractHttpUrlsFromString,
  insertMissingUrlsInDocumentOrder,
  textIncludesUrl,
} from './urlInText.js';
import { sanitizePickedModerationText, shouldIncludeAnchorHref } from './pickSanitize.js';

export const LINKIFY_CLASS = 'Linkify';

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'LI',
  'ARTICLE',
  'SECTION',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TR',
  'BLOCKQUOTE',
]);
export const LINK_STYLE_PROVIDER_PREFIX = 'link_style-provider';

/**
 * @param {Element | null | undefined} el
 * @returns {el is HTMLElement}
 */
function isHTMLElement(el) {
  return el instanceof HTMLElement;
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function isNextdoorPrimaryText(el) {
  if (el.classList.contains(LINKIFY_CLASS)) return true;
  for (const name of el.classList) {
    if (name.includes('Linkify')) return true;
    if (name.startsWith(LINK_STYLE_PROVIDER_PREFIX)) return true;
  }
  return false;
}

/**
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function isPostLikeBlock(el) {
  if (el.tagName === 'ARTICLE') return true;
  const role = el.getAttribute('role');
  if (role === 'article' || role === 'listitem') return true;
  if (el.hasAttribute('data-item-id')) return true;

  const testId = (el.getAttribute('data-testid') ?? '').toLowerCase();
  if (
    testId &&
    /comment|post-body|post-text|feed-item|feed_item|detail-post|story-body|reply/.test(testId)
  ) {
    return true;
  }
  return false;
}

/**
 * Nextdoor comment / reply body (tighter than whole card).
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function isCommentTextBlock(el) {
  const testId = (el.getAttribute('data-testid') ?? '').toLowerCase();
  if (
    testId &&
    /comment-(text|body|content|message)|reply-(text|body|content|message)|post-(text|body|content)/.test(
      testId,
    )
  ) {
    return true;
  }
  const cls = String(el.className ?? '').toLowerCase();
  return /(?:^|[\s_-])(comment|reply)[-_]?(text|body|content|message)(?:[\s_-]|$)/.test(cls);
}

/**
 * @param {HTMLElement} el
 * @returns {number}
 */
export function pickTargetTextLength(el) {
  return String(el.innerText ?? el.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Stop at the block under the click when a parent also holds other posts/comments.
 * @param {Element | null | undefined} el
 * @returns {HTMLElement | null}
 */
export function tightCaptureTargetForClick(el) {
  if (!(el instanceof HTMLElement)) return null;

  let best = el;
  let bestLen = pickTargetTextLength(el);

  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const len = pickTargetTextLength(n);
    if (len < 10) continue;

    if (isNextdoorPrimaryText(n)) return n;

    if (isCommentTextBlock(n)) {
      best = n;
      bestLen = len;
    }

    const parent = n.parentElement;
    if (!parent || parent === document.body) {
      if (len >= 10 && len <= bestLen) best = n;
      break;
    }
    const parentLen = pickTargetTextLength(parent);

    if (parentLen > len + 100 && parentLen >= len * 1.35) {
      best = n;
      bestLen = len;
      break;
    }

    if (isPostLikeBlock(n) && len > 0 && len < bestLen) {
      best = n;
      bestLen = len;
    }
  }

  return bestLen >= 10 ? best : null;
}

/**
 * Smallest post/comment scope containing el (avoids whole thread on detail pages).
 * @param {Element | null | undefined} el
 * @returns {HTMLElement | null}
 */
export function smallestPickScopeContaining(el) {
  if (!(el instanceof HTMLElement)) return null;
  /** @type {HTMLElement[]} */
  const candidates = [];
  let node = el;
  while (node && node !== document.body) {
    if (isPostLikeBlock(node)) candidates.push(node);
    node = node.parentElement;
  }
  if (!candidates.length) return null;

  let best = candidates[0];
  let bestLen = best.textContent?.length ?? Infinity;
  for (const c of candidates) {
    const len = c.textContent?.length ?? 0;
    if (len > 0 && len < bestLen) {
      best = c;
      bestLen = len;
    }
  }
  return best;
}

/**
 * Prefer post title/body text (Linkify) over whole card chrome.
 * @param {Element | null} el
 * @returns {HTMLElement | null}
 */
export function captureTargetForElement(el) {
  if (!el) return null;
  if (!(el instanceof HTMLElement) && el.parentElement instanceof HTMLElement) {
    el = el.parentElement;
  }
  if (!(el instanceof HTMLElement)) return null;

  let deepestPrimary = null;
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (isNextdoorPrimaryText(node)) deepestPrimary = node;
  }
  if (deepestPrimary) return deepestPrimary;

  const tight = tightCaptureTargetForClick(el);
  if (tight) {
    const scoped = smallestPickScopeContaining(tight);
    if (scoped) {
      const tightLen = pickTargetTextLength(tight);
      const scopedLen = pickTargetTextLength(scoped);
      if (scopedLen <= tightLen * 1.35 + 60) return scoped;
    }
    return tight;
  }

  const scoped = smallestPickScopeContaining(el);
  if (scoped) return scoped;

  if (isHTMLElement(el)) {
    let walk = el;
    while (walk && walk !== document.body) {
      const text = walk.innerText?.trim() ?? '';
      if (text.length >= 24 && walk.offsetHeight > 40) return walk;
      walk = walk.parentElement;
    }
    return el;
  }
  return null;
}

/**
 * Append http(s) link targets when visible text omits the URL (common on Nextdoor Linkify).
 * @param {ParentNode | null | undefined} root
 * @param {string} baseText
 * @param {string} [documentUrl] for tests; defaults to browser location in injected scripts
 * @returns {string}
 */
/**
 * Widen merge scope when the picked node is text-only but a parent holds the link.
 * @param {Element | null | undefined} target
 * @returns {ParentNode | null}
 */
export function anchorMergeRoot(target) {
  if (!(target instanceof HTMLElement)) return target ?? null;
  let node = target;
  for (let depth = 0; depth < 6 && node && node !== document.body; depth += 1) {
    if (node.querySelectorAll('a[href]').length > 0) return node;
    node = node.parentElement;
  }
  return target;
}

/**
 * Widen URL enrichment to the full post/card when the pick target is an inner paragraph.
 * @param {Element | null | undefined} target
 * @returns {HTMLElement | null}
 */
export function urlEnrichmentRoot(target) {
  if (!(target instanceof HTMLElement)) return null;
  const scoped = smallestPickScopeContaining(target);
  if (scoped) return scoped;
  const anchored = anchorMergeRoot(target);
  return anchored instanceof HTMLElement ? anchored : target;
}

const MAX_PICK_SCOPE_CHARS = 4500;

/**
 * When the click hits one Linkify line, walk the comment/post scope for capture.
 * @param {Element | null | undefined} target
 * @returns {HTMLElement | null}
 */
export function pickTextWalkRoot(target) {
  if (!(target instanceof HTMLElement)) return null;
  if (isNextdoorPrimaryText(target) || isCommentTextBlock(target)) {
    return target;
  }

  const targetLen = pickTargetTextLength(target);
  const scoped = smallestPickScopeContaining(target);
  if (scoped) {
    const scopedLen = pickTargetTextLength(scoped);
    if (scopedLen <= MAX_PICK_SCOPE_CHARS) {
      if (scoped === target || scopedLen <= targetLen * 1.35 + 60) return scoped;
    }
  }
  return target;
}

/**
 * Skip link preview cards and action chrome when walking a comment/post.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function shouldSkipPickSubtree(el) {
  const testId = (el.getAttribute('data-testid') ?? '').toLowerCase();
  if (/preview|unfurled|link-preview|embed|attachment|open-graph|og-/.test(testId)) {
    return true;
  }

  const role = el.getAttribute('role');
  if (role === 'button' || role === 'toolbar') return true;

  const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
  if (
    /link-preview|opengraph|unfurled|post-actions|comment-actions|reaction-bar|byline-header|comment-header|author-row|author-info|member-line|profile-card|avatar-row|neighbor-card/.test(
      cls,
    )
  ) {
    return true;
  }
  if (
    /comment-header|author-info|profile-name|member-name|avatar|profile-image|profile-picture|comment-author|post-author|author-avatar|user-avatar|attribution/.test(
      testId,
    )
  ) {
    return true;
  }

  if (el.tagName === 'TIME') return true;

  if (el.tagName === 'A') {
    const href = el.getAttribute('href') ?? '';
    if (/nextdoor\.com\/(profile|pages)\//i.test(href) || /\/user\//i.test(href)) {
      const linkText = (el.innerText ?? el.textContent ?? '').trim();
      if (linkText.length > 0 && linkText.length < 56) return true;
    }
  }

  if (
    /avatar|profile-photo|profile-picture|user-avatar|author-avatar|post-author|comment-author|byline|attribution|member-badge|neighbor-avatar/.test(
      cls,
    )
  ) {
    return true;
  }

  if (el.closest?.('[class*="Linkify"]') === el) return false;

  const text = (el.innerText ?? '').trim();
  if (el.querySelector('img') && el.querySelector('a[href^="http"]')) {
    if (text.length > 0 && text.length < 280 && !/^https?:\/\//m.test(text)) {
      return true;
    }
  }

  return false;
}

export function mergeAnchorHrefsIntoText(root, baseText, documentUrl) {
  const text = String(baseText).trim();
  if (!root || typeof root.querySelectorAll !== 'function') return text;

  const base =
    documentUrl ||
    (typeof location !== 'undefined' && location.href ? location.href : 'https://localhost/');

  /** @type {Set<string>} */
  const extras = new Set();

  for (const anchor of root.querySelectorAll('a[href]')) {
    const rawHref = anchor.getAttribute('href')?.trim();
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

    let absolute = rawHref;
    try {
      absolute = new URL(rawHref, base).href;
    } catch {
      continue;
    }

    if (!/^https?:\/\//i.test(absolute)) continue;
    if (!shouldIncludeAnchorHref(absolute)) continue;

    if (textIncludesUrl(text, absolute) || textIncludesUrl(text, rawHref)) continue;

    extras.add(absolute);
  }

  let out = text;
  if (extras.size) {
    out = `${out}\n${[...extras].join('\n')}`.trim();
  }

  const tc = root.textContent ?? '';
  const missing = extractHttpUrlsFromString(tc).filter(
    (url) => shouldIncludeAnchorHref(url) && !textIncludesUrl(out, url),
  );
  if (missing.length) {
    out = insertMissingUrlsInDocumentOrder(out, tc, missing);
  }

  return out.trim();
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
export function isHiddenElement(node) {
  if (!(node instanceof HTMLElement)) return false;
  if (node.hidden) return true;
  if (typeof getComputedStyle === 'function') {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
  }
  return false;
}

/**
 * DOM-order capture (text nodes + link hrefs). Keep in sync with content/pageTextExtract.js.
 * @param {Node | null | undefined} root
 * @param {string} [documentUrl]
 * @returns {string}
 */
/**
 * @param {Node | null | undefined} root
 * @param {string} [documentUrl]
 * @returns {string}
 */
export function walkCaptureTextFromRoot(root, documentUrl) {
  if (!root) return '';

  const base =
    documentUrl ||
    (typeof location !== 'undefined' && location.href ? location.href : 'https://localhost/');

  /**
   * @param {Node} node
   * @returns {string}
   */
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = /** @type {HTMLElement} */ (node);
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG'].includes(el.tagName)) return '';
    if (isHiddenElement(el)) return '';
    if (shouldSkipPickSubtree(el)) return '';

    if (el.tagName === 'A') {
      /** @type {string} */
      let visible = '';
      for (const child of el.childNodes) visible += walk(child);
      visible = visible.trim();
      const href = el.getAttribute('href')?.trim();
      let abs = '';
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          abs = new URL(href, base).href;
        } catch {
          abs = '';
        }
      }
      if (abs.startsWith('http') && !textIncludesUrl(visible, abs)) {
        return visible ? `${visible}\n${abs}` : abs;
      }
      return visible;
    }

    if (el.tagName === 'BR') return '\n';

    /** @type {string} */
    let combined = '';
    for (const child of el.childNodes) {
      combined += walk(child);
    }
    if (BLOCK_TAGS.has(el.tagName)) {
      const trimmed = combined.trimEnd();
      return trimmed ? `${trimmed}\n` : '\n';
    }
    return combined;
  }

  let out = walk(root).replace(/\n{3,}/g, '\n\n').trim();
  if (!out && root instanceof HTMLElement) {
    out = (root.innerText ?? root.textContent ?? '').trim();
  }
  return out;
}

/**
 * @param {Node | null | undefined} captureRoot
 * @param {string} [documentUrl]
 * @returns {string}
 */
export function extractCaptureTextFromRoot(captureRoot, documentUrl) {
  const capture = captureRoot instanceof HTMLElement ? captureRoot : null;
  const walkRoot = pickTextWalkRoot(capture) ?? captureRoot;
  const walked = walkCaptureTextFromRoot(walkRoot, documentUrl);
  const enrichRoot = urlEnrichmentRoot(capture) ?? capture;
  const merged = mergeAnchorHrefsIntoText(
    enrichRoot && typeof enrichRoot.querySelectorAll === 'function' ? enrichRoot : null,
    walked,
    documentUrl,
  );
  return sanitizePickedModerationText(merged);
}

/**
 * @param {HTMLElement | null} target
 * @param {Element | null} [fallbackEl]
 * @param {number} [maxLen]
 * @param {string} [documentUrl]
 * @returns {string}
 */
export function extractTextFromCaptureTarget(target, fallbackEl, maxLen = 32_000, documentUrl) {
  const capture = target ?? (fallbackEl instanceof HTMLElement ? fallbackEl : null);
  if (capture && 'childNodes' in capture && capture.childNodes?.length) {
    const walked = extractCaptureTextFromRoot(capture, documentUrl);
    if (walked.trim()) return walked.slice(0, maxLen);
  }
  const enrichRoot = urlEnrichmentRoot(capture instanceof HTMLElement ? capture : null) ??
    anchorMergeRoot(capture instanceof HTMLElement ? capture : null);
  const raw =
    (target instanceof HTMLElement ? target.innerText : null) ??
    target?.textContent ??
    fallbackEl?.textContent ??
    '';
  const merged = mergeAnchorHrefsIntoText(enrichRoot, raw, documentUrl);
  return merged.slice(0, maxLen);
}
