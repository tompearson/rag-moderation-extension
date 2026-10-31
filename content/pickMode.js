/**
 * One-shot pick overlay (injected via chrome.scripting.executeScript).
 * Prefers Nextdoor post text (Linkify / link_style-provider), then post-like blocks.
 * Heuristics mirror lib/contentPickTargets.js.
 */
(function initPickMode() {
  const FLAG = '__ragModerationPickModeActive';
  const CLEANUP_KEY = '__ragModerationPickModeCleanup';
  const win = /** @type {Record<string, unknown>} */ (window);
  if (win[FLAG] && typeof win[CLEANUP_KEY] === 'function') {
    /** @type {() => void} */ (win[CLEANUP_KEY])();
  }
  win[FLAG] = true;

  const MAX_TEXT = 32_000;
  const LINKIFY_CLASS = 'Linkify';
  const LINK_STYLE_PROVIDER_PREFIX = 'link_style-provider';
  const OVERLAY_ID = 'rag-moderation-pick-overlay';
  const BANNER_ID = 'rag-moderation-pick-banner';

  /** @type {HTMLElement | null} */
  let highlightEl = null;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.setAttribute('data-rag-pick-overlay', '1');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483646',
    cursor: 'crosshair',
    background: 'rgba(15, 23, 42, 0.12)',
    pointerEvents: 'none',
  });

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.textContent = 'Click post title or body text · Esc to cancel';
  Object.assign(banner.style, {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    padding: '8px 14px',
    borderRadius: '8px',
    background: '#0f172a',
    color: '#f8fafc',
    font: '13px/1.4 system-ui, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    pointerEvents: 'none',
  });

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
      highlightEl = null;
    }
    banner.remove();
    overlay.remove();
    delete win[FLAG];
    delete win[CLEANUP_KEY];
  }

  win[CLEANUP_KEY] = cleanup;

  function finish(payload) {
    cleanup();
    try {
      chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      /* extension context gone */
    }
  }

  /**
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  function isNextdoorPrimaryText(el) {
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
  function isPostLikeBlock(el) {
    if (el.tagName === 'ARTICLE') return true;
    const role = el.getAttribute('role');
    if (role === 'article' || role === 'listitem') return true;
    if (el.hasAttribute('data-testid')) return true;
    if (el.hasAttribute('data-item-id')) return true;
    return false;
  }

  /**
   * @param {Element | null} el
   * @returns {HTMLElement | null}
   */
  function captureTargetForElement(el) {
    if (!el) return null;

    let node = el;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && isNextdoorPrimaryText(node)) {
        return node;
      }
      node = node.parentElement;
    }

    /** @type {HTMLElement | null} */
    let outermostPost = null;
    node = el;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && isPostLikeBlock(node)) {
        outermostPost = node;
      }
      node = node.parentElement;
    }
    if (outermostPost) return outermostPost;

    if (el instanceof HTMLElement) {
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

  function isPickChrome(el) {
    if (!(el instanceof HTMLElement)) return true;
    if (el.id === OVERLAY_ID || el.id === BANNER_ID) return true;
    return !!el.closest?.(`#${OVERLAY_ID}, #${BANNER_ID}`);
  }

  function setHighlight(block) {
    if (highlightEl === block) return;
    if (highlightEl) {
      highlightEl.style.outline = '';
      highlightEl.style.outlineOffset = '';
    }
    highlightEl = block;
    if (block) {
      block.style.outline = '2px solid #2563eb';
      block.style.outlineOffset = '2px';
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      finish({ type: 'PICK_MODE_CANCELLED' });
    }
  }

  /** @param {MouseEvent} e */
  function onMove(e) {
    if (isPickChrome(/** @type {Element} */ (e.target))) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || isPickChrome(under)) {
      setHighlight(null);
      return;
    }
    setHighlight(captureTargetForElement(under));
  }

  /** @param {MouseEvent} e */
  function onClick(e) {
    if (isPickChrome(/** @type {Element} */ (e.target))) return;
    e.preventDefault();
    e.stopPropagation();
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || isPickChrome(under)) return;
    const target = captureTargetForElement(under);
    const text = (target?.innerText ?? target?.textContent ?? under.textContent ?? '')
      .trim()
      .slice(0, MAX_TEXT);
    if (!text) {
      finish({ type: 'PICK_MODE_CANCELLED' });
      return;
    }
    finish({ type: 'PICK_MODE_COMPLETE', text });
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.body.append(banner, overlay);
})();
