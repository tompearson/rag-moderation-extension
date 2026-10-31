/** Nextdoor post title / primary text (e.g. Linkify spans). Keep in sync with content/pickMode.js heuristics. */

export const LINKIFY_CLASS = 'Linkify';
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
  if (el.hasAttribute('data-testid')) return true;
  if (el.hasAttribute('data-item-id')) return true;
  return false;
}

/**
 * Prefer post title/body text (Linkify) over whole card chrome.
 * @param {Element | null} el
 * @returns {HTMLElement | null}
 */
export function captureTargetForElement(el) {
  if (!el) return null;

  let node = el;
  while (node && node !== document.body) {
    if (isHTMLElement(node) && isNextdoorPrimaryText(node)) {
      return node;
    }
    node = node.parentElement;
  }

  /** @type {HTMLElement | null} */
  let outermostPost = null;
  node = el;
  while (node && node !== document.body) {
    if (isHTMLElement(node) && isPostLikeBlock(node)) {
      outermostPost = node;
    }
    node = node.parentElement;
  }
  if (outermostPost) return outermostPost;

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

    const variants = [rawHref, absolute, rawHref.replace(/\/$/, ''), absolute.replace(/\/$/, '')];
    if (variants.some((v) => v.length > 8 && text.includes(v))) continue;

    extras.add(absolute);
  }

  if (!extras.size) return text;
  return `${text}\n${[...extras].join('\n')}`.trim();
}

/**
 * @param {HTMLElement | null} target
 * @param {Element | null} [fallbackEl]
 * @param {number} [maxLen]
 * @param {string} [documentUrl]
 * @returns {string}
 */
export function extractTextFromCaptureTarget(target, fallbackEl, maxLen = 32_000, documentUrl) {
  const raw = target?.innerText ?? target?.textContent ?? fallbackEl?.textContent ?? '';
  const mergeRoot = anchorMergeRoot(target ?? (fallbackEl instanceof HTMLElement ? fallbackEl : null));
  const merged = mergeAnchorHrefsIntoText(mergeRoot, raw, documentUrl);
  return merged.slice(0, maxLen);
}
