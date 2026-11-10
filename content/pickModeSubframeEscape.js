/**
 * Escape cancels pick when focus is inside an injectable subframe (same tab).
 * Top frame uses content/pickMode.js for the full overlay.
 */
(function initPickSubframeEscape() {
  if (window.top === window) return;

  const CLEANUP_KEY = '__ragModerationPickSubframeEscapeCleanup';
  const w = /** @type {Record<string, unknown>} */ (window);
  const existing = w[CLEANUP_KEY];
  if (typeof existing === 'function') {
    /** @type {() => void} */ (existing)();
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    try {
      chrome.runtime.sendMessage({ type: 'PICK_MODE_CANCELLED' }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      /* extension context gone */
    }
  }

  function cleanup() {
    window.removeEventListener('keydown', onKeyDown, true);
    delete w[CLEANUP_KEY];
  }

  w[CLEANUP_KEY] = cleanup;
  window.addEventListener('keydown', onKeyDown, true);
})();
