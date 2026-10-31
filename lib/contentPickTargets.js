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
 * @param {HTMLElement | null} target
 * @param {Element | null} [fallbackEl]
 * @param {number} [maxLen]
 * @returns {string}
 */
export function extractTextFromCaptureTarget(target, fallbackEl, maxLen = 32_000) {
  const raw = target?.innerText ?? target?.textContent ?? fallbackEl?.textContent ?? '';
  return String(raw).trim().slice(0, maxLen);
}
