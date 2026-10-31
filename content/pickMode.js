/**
 * One-shot pick overlay (injected via chrome.scripting.executeScript).
 * Drag to select multiple paragraphs; click (no drag) captures Linkify / post block.
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
  const DRAG_THRESHOLD_PX = 5;
  const LINKIFY_CLASS = 'Linkify';
  const LINK_STYLE_PROVIDER_PREFIX = 'link_style-provider';
  const OVERLAY_ID = 'rag-moderation-pick-overlay';
  const BANNER_ID = 'rag-moderation-pick-banner';

  /** @type {HTMLElement | null} */
  let highlightEl = null;
  /** @type {boolean} */
  let pointerDown = false;
  /** @type {boolean} */
  let dragSelecting = false;
  /** @type {number} */
  let anchorX = 0;
  /** @type {number} */
  let anchorY = 0;

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
  banner.textContent = 'Drag to select text across paragraphs, or click a post line · Esc to cancel';
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
    maxWidth: 'min(420px, 92vw)',
    textAlign: 'center',
  });

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    clearHoverHighlight();
    try {
      window.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
    banner.remove();
    overlay.remove();
    delete win[FLAG];
    delete win[CLEANUP_KEY];
    pointerDown = false;
    dragSelecting = false;
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
   * @param {number} x
   * @param {number} y
   * @returns {Range | null}
   */
  function caretRangeAt(x, y) {
    if (document.caretRangeFromPoint) {
      return document.caretRangeFromPoint(x, y);
    }
    const pos = document.caretPositionFromPoint?.(x, y);
    if (!pos) return null;
    const range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.collapse(true);
    return range;
  }

  /**
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   */
  function applySelectionBetweenPoints(x1, y1, x2, y2) {
    const startCaret = caretRangeAt(x1, y1);
    const endCaret = caretRangeAt(x2, y2);
    if (!startCaret || !endCaret) return;

    const range = document.createRange();
    const startNode = startCaret.startContainer;
    const startOff = startCaret.startOffset;
    const endNode = endCaret.startContainer;
    const endOff = endCaret.startOffset;

    try {
      range.setStart(startNode, startOff);
      range.setEnd(endNode, endOff);
    } catch {
      try {
        range.setStart(endNode, endOff);
        range.setEnd(startNode, startOff);
      } catch {
        return;
      }
    }

    if (range.collapsed) return;

    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
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

  function clearHoverHighlight() {
    if (!highlightEl) return;
    highlightEl.style.outline = '';
    highlightEl.style.outlineOffset = '';
    highlightEl = null;
  }

  function setHighlight(block) {
    if (pointerDown || dragSelecting) return;
    if (highlightEl === block) return;
    clearHoverHighlight();
    highlightEl = block;
    if (block) {
      block.style.outline = '2px solid #2563eb';
      block.style.outlineOffset = '2px';
    }
  }

  /**
   * @param {Element | null} under
   * @returns {string}
   */
  function textFromClickTarget(under) {
    if (!under) return '';
    const target = captureTargetForElement(under);
    const extract = /** @type {typeof window.__ragPageTextExtract | undefined} */ (
      window.__ragPageTextExtract
    );
    if (extract?.elementTextWithLinks) {
      return extract.elementTextWithLinks(target, under, MAX_TEXT);
    }
    return (target?.innerText ?? target?.textContent ?? under.textContent ?? '')
      .trim()
      .slice(0, MAX_TEXT);
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
    if (pointerDown && (e.buttons & 1)) {
      const dx = e.clientX - anchorX;
      const dy = e.clientY - anchorY;
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        dragSelecting = true;
        clearHoverHighlight();
        applySelectionBetweenPoints(anchorX, anchorY, e.clientX, e.clientY);
      }
      return;
    }

    if (dragSelecting || pointerDown) return;

    if (isPickChrome(/** @type {Element} */ (e.target))) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || isPickChrome(under)) {
      setHighlight(null);
      return;
    }
    setHighlight(captureTargetForElement(under));
  }

  /** @param {MouseEvent} e */
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (isPickChrome(/** @type {Element} */ (e.target))) return;
    pointerDown = true;
    dragSelecting = false;
    anchorX = e.clientX;
    anchorY = e.clientY;
    clearHoverHighlight();
    e.preventDefault();
  }

  /** @param {MouseEvent} e */
  function onMouseUp(e) {
    if (!pointerDown) return;
    pointerDown = false;

    if (isPickChrome(/** @type {Element} */ (e.target))) {
      dragSelecting = false;
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (dragSelecting) {
      const extract = /** @type {typeof window.__ragPageTextExtract | undefined} */ (
        window.__ragPageTextExtract
      );
      const selected = extract?.selectionTextWithLinks
        ? extract.selectionTextWithLinks()
        : (window.getSelection()?.toString?.().trim() ?? '');
      dragSelecting = false;
      if (selected) {
        finish({ type: 'PICK_MODE_COMPLETE', text: selected.slice(0, MAX_TEXT) });
        return;
      }
    }

    const under = document.elementFromPoint(e.clientX, e.clientY);
    const text = textFromClickTarget(under);
    dragSelecting = false;
    if (!text) {
      finish({ type: 'PICK_MODE_CANCELLED' });
      return;
    }
    finish({ type: 'PICK_MODE_COMPLETE', text });
  }

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.body.append(banner, overlay);
})();
