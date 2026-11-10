/**
 * In-page text extraction (injected before Click on Text to Moderate).
 * Keep walk + URL merge logic in sync with lib/contentPickTargets.js and lib/urlInText.js.
 */
(function initPageTextExtract(global) {
  const HTTP_URL_IN_TEXT_RE = /\bhttps?:\/\/[^\s<>"')\]\u2019\u201d]+/gi;
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

  /**
   * @param {string | null | undefined} s
   * @returns {string[]}
   */
  function extractHttpUrlsFromString(s) {
    if (!s) return [];
    /** @type {string[]} */
    const out = [];
    /** @type {Set<string>} */
    const seen = new Set();
    for (const match of String(s).matchAll(HTTP_URL_IN_TEXT_RE)) {
      const raw = match[0].replace(/[.,;:!?]+$/, '');
      if (!raw || seen.has(raw)) continue;
      seen.add(raw);
      out.push(raw);
    }
    return out;
  }

  /**
   * @param {string} text
   * @param {string} url
   * @returns {boolean}
   */
  function textIncludesUrl(text, url) {
    if (!url) return false;
    const variants = [url, url.replace(/\/$/, ''), `${url}/`];
    return variants.some((v) => v.length > 12 && text.includes(v));
  }

  /**
   * @param {string} text
   * @param {string} textContent
   * @param {string[]} missingUrls
   * @returns {string}
   */
  function insertMissingUrlsInDocumentOrder(text, textContent, missingUrls) {
    let result = text;
    for (const url of missingUrls) {
      if (textIncludesUrl(result, url)) continue;

      const idx = textContent.indexOf(url);
      if (idx < 0) {
        result = `${result}\n${url}`;
        continue;
      }

      const before = textContent.slice(Math.max(0, idx - 120), idx).trim();
      const anchor = before.slice(-48);
      if (anchor.length >= 8) {
        const pos = result.indexOf(anchor);
        if (pos >= 0) {
          const insertAt = pos + anchor.length;
          result = `${result.slice(0, insertAt)}\n${url}${result.slice(insertAt)}`;
          continue;
        }
      }

      result = `${result}\n${url}`;
    }
    return result.trim();
  }

  /**
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isPostLikeBlock(el) {
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

  function isCommentTextBlock(el) {
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

  function pickTargetTextLength(el) {
    return String(el.innerText ?? el.textContent ?? '')
      .replace(/\s+/g, ' ')
      .trim().length;
  }

  function smallestPickScopeContaining(el) {
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

  const MAX_PICK_SCOPE_CHARS = 4500;

  function isExternalModerationUrl(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host === 'nextdoor.com' || host.endsWith('.nextdoor.com')) return false;
    } catch {
      return false;
    }
    return /^https?:\/\//i.test(url);
  }

  function isPosterMetadataLine(line) {
    const t = String(line).trim();
    if (!t) return true;
    if (/^[A-Z]$/.test(t)) return true;
    if (/^(?:just now|yesterday)$/i.test(t)) return true;
    if (
      /^\d+\s*(?:s|sec|secs?|second|seconds|m|min|mins?|minute|minutes|h|hr|hrs?|hour|hours|d|day|days|w|wk|week|weeks|mo|month|months|y|yr|years?)\s+ago$/i.test(
        t,
      )
    ) {
      return true;
    }
    if (/^[A-Z][a-z]+(?:['\u2019][a-z]+)?\s+[A-Z]\.$/.test(t)) return true;
    return false;
  }

  function stripLeadingPosterMetadata(lines) {
    let i = 0;
    while (i < lines.length && isPosterMetadataLine(lines[i])) {
      i += 1;
    }
    return lines.slice(i);
  }

  function sanitizePickedModerationText(text) {
    let out = String(text).replace(/\r/g, '');
    out = out.replace(/(https:\/\/[^\s]*?[a-z0-9\/])([A-Z][a-zA-Z])/g, '$1\n$2');

    /** @type {string[]} */
    const lines = [];
    /** @type {Set<string>} */
    const seenUrls = new Set();

    for (const rawLine of out.split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/^(Like|Helpful|Reply|Edited|Author|\d+h|\d+m|\d+d|\d+\s*comments?)$/i.test(line)) {
        continue;
      }
      if (/^Post details$/i.test(line)) continue;
      if (/^\d+$/.test(line)) continue;
      if (isPosterMetadataLine(line)) continue;

      if (/^https?:\/\//i.test(line)) {
        if (!isExternalModerationUrl(line)) continue;
        const norm = line.replace(/\/$/, '');
        if (seenUrls.has(norm)) continue;
        seenUrls.add(norm);
        lines.push(line);
        continue;
      }

      lines.push(line);
    }

    const body = stripLeadingPosterMetadata(lines);
    return body.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * @param {Element | null | undefined} target
   * @returns {HTMLElement | null}
   */
  function anchorMergeRoot(target) {
    if (!(target instanceof HTMLElement)) return target ?? null;
    let node = target;
    for (let depth = 0; depth < 6 && node && node !== document.body; depth += 1) {
      if (node.querySelectorAll('a[href]').length > 0) return node;
      node = node.parentElement;
    }
    return target;
  }

  /**
   * @param {Element | null | undefined} target
   * @returns {HTMLElement | null}
   */
  function urlEnrichmentRoot(target) {
    if (!(target instanceof HTMLElement)) return null;
    const scoped = smallestPickScopeContaining(target);
    if (scoped) return scoped;
    return anchorMergeRoot(target);
  }

  /**
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isNextdoorPrimaryText(el) {
    if (el.classList.contains('Linkify')) return true;
    for (const name of el.classList) {
      if (name.includes('Linkify')) return true;
      if (name.startsWith('link_style-provider')) return true;
    }
    return false;
  }

  /**
   * @param {Element | null | undefined} target
   * @returns {HTMLElement | null}
   */
  function pickTextWalkRoot(target) {
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
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function shouldSkipPickSubtree(el) {
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

  /**
   * @param {Node} node
   * @returns {boolean}
   */
  function isHiddenElement(node) {
    if (!(node instanceof HTMLElement)) return false;
    if (node.hidden) return true;
    const style = global.getComputedStyle?.(node);
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true;
    return false;
  }

  /**
   * @param {ParentNode | null | undefined} root
   * @param {string} baseText
   * @returns {string}
   */
  function mergeAnchorHrefsIntoText(root, baseText) {
    const text = String(baseText).trim();
    if (!root || typeof root.querySelectorAll !== 'function') return text;

    const base = global.location?.href || 'https://localhost/';
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
      if (!isExternalModerationUrl(absolute)) continue;
      if (textIncludesUrl(text, absolute) || textIncludesUrl(text, rawHref)) continue;

      extras.add(absolute);
    }

    let out = text;
    if (extras.size) {
      out = `${out}\n${[...extras].join('\n')}`.trim();
    }

    const tc = root.textContent ?? '';
    const missing = extractHttpUrlsFromString(tc).filter(
      (url) => isExternalModerationUrl(url) && !textIncludesUrl(out, url),
    );
    if (missing.length) {
      out = insertMissingUrlsInDocumentOrder(out, tc, missing);
    }

    return out.trim();
  }

  /**
   * @param {Node | null | undefined} root
   * @returns {string}
   */
  function walkCaptureTextFromRoot(root) {
    if (!root) return '';

    const base = global.location?.href || 'https://localhost/';

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
   * @param {HTMLElement | null | undefined} captureRoot
   * @returns {string}
   */
  function extractCaptureTextFromRoot(captureRoot) {
    const walkRoot = pickTextWalkRoot(captureRoot) ?? captureRoot;
    const walked = walkCaptureTextFromRoot(walkRoot);
    const enrichRoot = urlEnrichmentRoot(captureRoot) ?? captureRoot;
    const merged = mergeAnchorHrefsIntoText(
      enrichRoot && typeof enrichRoot.querySelectorAll === 'function' ? enrichRoot : null,
      walked,
    );
    return sanitizePickedModerationText(merged);
  }

  /**
   * @returns {string}
   */
  function selectionTextWithLinks() {
    const sel = global.getSelection?.();
    let text = sel?.toString?.()?.trim() ?? '';
    if (!text || !sel?.rangeCount) return text;

    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof HTMLElement)) return text;

    const enrichRoot = urlEnrichmentRoot(node) ?? node;
    return sanitizePickedModerationText(mergeAnchorHrefsIntoText(enrichRoot, text));
  }

  /**
   * @param {HTMLElement | null} target
   * @param {Element | null | undefined} fallbackEl
   * @param {number} maxLen
   * @returns {string}
   */
  function elementTextWithLinks(target, fallbackEl, maxLen) {
    const capture =
      target ?? (fallbackEl instanceof HTMLElement ? fallbackEl : null);
    let out = '';
    if (capture && capture.childNodes?.length) {
      out = extractCaptureTextFromRoot(capture);
    }
    if (!out.trim() && capture instanceof HTMLElement) {
      out = mergeAnchorHrefsIntoText(
        urlEnrichmentRoot(capture) ?? capture,
        capture.innerText ?? capture.textContent ?? '',
      );
    }
    if (!out.trim()) {
      out = fallbackEl?.textContent ?? '';
    }
    return out.trim().slice(0, maxLen);
  }

  global.__ragPageTextExtract = {
    mergeAnchorHrefsIntoText,
    selectionTextWithLinks,
    elementTextWithLinks,
    extractCaptureTextFromRoot,
  };
})(typeof window !== 'undefined' ? window : globalThis);
