/**
 * In-page text extraction helpers (injected before pick / From tab).
 * Keep mergeAnchorHrefsIntoText in sync with lib/contentPickTargets.js.
 */
(function initPageTextExtract(global) {
  /**
   * @param {ParentNode | null | undefined} root
   * @param {string} baseText
   * @returns {string}
   */
  /**
   * @param {Element | null | undefined} target
   * @returns {ParentNode | null}
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

      const variants = [rawHref, absolute, rawHref.replace(/\/$/, ''), absolute.replace(/\/$/, '')];
      if (variants.some((v) => v.length > 8 && text.includes(v))) continue;

      extras.add(absolute);
    }

    if (!extras.size) return text;
    return `${text}\n${[...extras].join('\n')}`.trim();
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
    if (node instanceof HTMLElement) {
      text = mergeAnchorHrefsIntoText(node, text);
    }
    return text.trim();
  }

  /**
   * @param {HTMLElement | null} target
   * @param {Element | null | undefined} fallbackEl
   * @param {number} maxLen
   * @returns {string}
   */
  function elementTextWithLinks(target, fallbackEl, maxLen) {
    const raw = target?.innerText ?? target?.textContent ?? fallbackEl?.textContent ?? '';
    const mergeRoot = anchorMergeRoot(
      target ?? (fallbackEl instanceof HTMLElement ? fallbackEl : null),
    );
    const merged = mergeAnchorHrefsIntoText(mergeRoot, raw);
    return merged.trim().slice(0, maxLen);
  }

  global.__ragPageTextExtract = {
    mergeAnchorHrefsIntoText,
    selectionTextWithLinks,
    elementTextWithLinks,
  };
})(typeof window !== 'undefined' ? window : globalThis);
