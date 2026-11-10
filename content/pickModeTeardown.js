/**
 * Tear down in-page pick overlay (injected via chrome.scripting.executeScript).
 * Safe after extension reload when the side panel no longer tracks pick state.
 */
(function tearDownPickModeInPage() {
  const w = /** @type {Record<string, unknown>} */ (window);
  const cleanup = w.__ragModerationPickModeCleanup;
  if (typeof cleanup === 'function') {
    try {
      /** @type {() => void} */ (cleanup)();
    } catch {
      /* disconnected listeners */
    }
    return;
  }
  document.getElementById('rag-moderation-pick-overlay')?.remove();
  document.getElementById('rag-moderation-pick-banner')?.remove();
  delete w.__ragModerationPickModeActive;
  delete w.__ragModerationPickModeCleanup;
  const subCleanup = w.__ragModerationPickSubframeEscapeCleanup;
  if (typeof subCleanup === 'function') {
    try {
      /** @type {() => void} */ (subCleanup)();
    } catch {
      /* ignore */
    }
  }
})();
