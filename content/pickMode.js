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
  /** @type {{ position: string; zIndex: string } | null} */
  let highlightStyleRestore = null;
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
    background: 'rgba(15, 23, 42, 0.22)',
    pointerEvents: 'none',
  });

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.textContent =
    'Click on text or drag to select what to capture · Esc cancels (page or extension side panel)';
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
    pointerEvents: 'auto',
    maxWidth: 'min(420px, 92vw)',
    textAlign: 'center',
  });
  banner.setAttribute('tabindex', '-1');
  banner.setAttribute('role', 'status');

  /** Block synthesized clicks on links after pick (cleanup used to run before click fired). */
  let blockPageNavigation = true;

  function swallowPageActivation(e) {
    if (!blockPageNavigation) return;
    const t = /** @type {Node | null} */ (e.target);
    if (t && (overlay.contains(t) || banner.contains(t))) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Element | null}
   */
  function elementUnderPagePoint(x, y) {
    return document.elementFromPoint(x, y);
  }

  function cleanup() {
    blockPageNavigation = false;
    window.removeEventListener('keydown', onKeyDown, true);
    banner.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click', swallowPageActivation, true);
    document.removeEventListener('auxclick', swallowPageActivation, true);
    document.removeEventListener('pointerup', swallowPageActivation, true);
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
    try {
      chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      /* extension context gone */
    }
    if (payload?.type === 'PICK_MODE_CANCELLED') {
      cleanup();
      return;
    }
    // Keep swallowing clicks briefly so links under the pick target do not open.
    setTimeout(cleanup, 400);
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

  function tightCaptureTargetForClick(el) {
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

  /**
   * @param {Element | null} el
   * @returns {HTMLElement | null}
   */
  function captureTargetForElement(el) {
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
    highlightEl.style.backgroundColor = '';
    highlightEl.style.boxShadow = '';
    if (highlightStyleRestore) {
      highlightEl.style.position = highlightStyleRestore.position;
      highlightEl.style.zIndex = highlightStyleRestore.zIndex;
      highlightStyleRestore = null;
    }
    highlightEl = null;
  }

  function setHighlight(block) {
    if (pointerDown || dragSelecting) return;
    if (highlightEl === block) return;
    clearHoverHighlight();
    highlightEl = block;
    if (block) {
      highlightStyleRestore = {
        position: block.style.position,
        zIndex: block.style.zIndex,
      };
      block.style.outline = '2px solid #2563eb';
      block.style.outlineOffset = '2px';
      block.style.backgroundColor = 'rgba(37, 99, 235, 0.14)';
      block.style.boxShadow = '0 0 0 1px rgba(37, 99, 235, 0.35)';
      if (getComputedStyle(block).position === 'static') {
        block.style.position = 'relative';
      }
      block.style.zIndex = '2147483645';
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
    if (isPickChrome(/** @type {Element} */ (e.target))) return;

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

    const under = elementUnderPagePoint(e.clientX, e.clientY);
    if (!under || isPickChrome(under)) {
      setHighlight(null);
      return;
    }
    setHighlight(captureTargetForElement(under));
  }

  /** @param {MouseEvent} e */
  function onMouseDown(e) {
    if (e.button !== 0) return;
    pointerDown = true;
    dragSelecting = false;
    anchorX = e.clientX;
    anchorY = e.clientY;
    clearHoverHighlight();
    e.preventDefault();
    e.stopPropagation();
  }

  /** @param {MouseEvent} e */
  function onMouseUp(e) {
    if (!pointerDown) return;
    pointerDown = false;

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

    const under = elementUnderPagePoint(e.clientX, e.clientY);
    const text = textFromClickTarget(under);
    dragSelecting = false;
    if (!text) {
      finish({ type: 'PICK_MODE_CANCELLED' });
      return;
    }
    finish({ type: 'PICK_MODE_COMPLETE', text });
  }

  window.addEventListener('keydown', onKeyDown, true);
  banner.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', swallowPageActivation, true);
  document.addEventListener('auxclick', swallowPageActivation, true);
  document.addEventListener('pointerup', swallowPageActivation, true);
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.body.append(banner, overlay);
  try {
    banner.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }
})();
