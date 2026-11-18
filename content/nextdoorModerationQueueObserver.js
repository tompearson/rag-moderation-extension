/**
 * Runs on nextdoor.com (manifest content_scripts). Publishes reported-content count for Auto Moderate.
 */
(function () {
  const COUNT_KEY = 'nextdoorModerationQueueCount';
  const PATH_KEY = 'nextdoorModerationQueuePathname';
  const UPDATED_KEY = 'nextdoorModerationQueueUpdatedAt';
  const PENDING_KEY = 'pendingAutoModerateQueueCount';
  const DISMISS_KEY = 'autoModerateQueueDismissed';
  const AUTO_MODERATE_LOCAL_KEY = 'autoModerateEnabled';
  const READ_MSG = 'READ_MODERATION_QUEUE_COUNT';

  /** @type {number|null} */
  let pollInterval = null;

  function extensionContextLive() {
    try {
      return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  function stopPolling() {
    if (pollInterval != null) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function isContextInvalidatedError(err) {
    const msg = String(err?.message ?? err);
    return msg.includes('Extension context invalidated');
  }

  /** Run fn when the extension context is still valid; stop polling on invalidated errors. */
  function safeChromeCall(fn) {
    if (!extensionContextLive()) {
      stopPolling();
      return false;
    }
    try {
      fn();
      return true;
    } catch (err) {
      if (isContextInvalidatedError(err)) stopPolling();
      return false;
    }
  }

  function parseCount(text) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) return null;
    if (/^\d+\+$/.test(trimmed)) {
      const n = parseInt(trimmed.replace('+', ''), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    const n = parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  function isReportedContentLabel(label) {
    const t = String(label ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return t.includes('reported content') || t.includes('reported posts') || t === 'reported';
  }

  function countFromBadges(root) {
    if (!root?.querySelectorAll) return null;
    const badges = root.querySelectorAll('[class*="Badge"], span[data-block]');
    for (const badge of badges) {
      const n = parseCount(badge.textContent);
      if (n != null) return n;
    }
    return null;
  }

  function countNearElement(el) {
    let node = el;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      const n = countFromBadges(node);
      if (n != null) return n;
      node = node.parentElement;
    }
    return null;
  }

  function readCountFromRoot(root) {
    if (!root?.querySelectorAll) return null;

    const navRoots = [];
    for (const sel of ['nav', '[role="navigation"]', 'aside', '[class*="Nav"]', '[class*="Sidebar"]']) {
      const found = root.querySelectorAll?.(sel) || [];
      for (const n of found) navRoots.push(n);
    }

    const searchRoots = navRoots.length ? navRoots : [root];

    for (const searchRoot of searchRoots) {
      const navCandidates = searchRoot.querySelectorAll('a, button, [role="menuitem"], [role="link"], [role="button"]');
      for (const el of navCandidates) {
        const label = el.textContent || '';
        const href = el.getAttribute?.('href') || '';
        const hrefMatch = /moderation_feed|reported/i.test(href);
        if (!isReportedContentLabel(label) && !hrefMatch) continue;

        const n = countNearElement(el);
        if (n != null) return n;
      }

      for (const el of searchRoot.querySelectorAll('[class*="Badge_variant_number"], [class*="Badge"]')) {
        const n = parseCount(el.textContent);
        if (n != null && n <= 99) return n;
      }
    }

    const blockBadge = root.querySelector?.('span[data-block="3"]');
    if (blockBadge) {
      const fromBlock = parseCount(blockBadge.textContent);
      if (fromBlock != null) return fromBlock;
    }

    for (const link of root.querySelectorAll?.('a[href*="moderation_feed"]') || []) {
      const n = countNearElement(link);
      if (n != null) return n;
    }

    return null;
  }

  function collectDocumentRoots(node, roots) {
    if (node instanceof Document) {
      roots.push(node);
      if (node.documentElement) collectDocumentRoots(node.documentElement, roots);
      return;
    }
    if (node instanceof DocumentFragment || node instanceof Element) {
      roots.push(node);
      if (node instanceof Element && node.shadowRoot) {
        collectDocumentRoots(node.shadowRoot, roots);
      }
      for (const child of node.children) {
        collectDocumentRoots(child, roots);
      }
    }
  }

  function readCountIncludingShadowDom() {
    const roots = [];
    collectDocumentRoots(document.documentElement, roots);
    for (const root of roots) {
      const n = readCountFromRoot(root);
      if (n != null) return n;
    }
    return null;
  }

  function newsFeedPathname() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    return path === '/news_feed' ? path : null;
  }

  function sessionArea() {
    const area = chrome.storage?.session;
    return area && typeof area.get === 'function' && typeof area.set === 'function'
      ? area
      : null;
  }

  function publishSession() {
    if (!extensionContextLive()) {
      stopPolling();
      return;
    }

    const session = sessionArea();
    if (!session) return;

    const path = newsFeedPathname();
    if (!path) {
      safeChromeCall(() => {
        session.remove([COUNT_KEY, PATH_KEY, UPDATED_KEY, PENDING_KEY]);
      });
      return;
    }

    const n = readCountIncludingShadowDom();

    safeChromeCall(() => {
      chrome.storage.local.get({ [AUTO_MODERATE_LOCAL_KEY]: true }, (local) => {
        if (!extensionContextLive()) {
          stopPolling();
          return;
        }
        const autoModerateOn = local[AUTO_MODERATE_LOCAL_KEY] !== false;
        try {
          session.get([DISMISS_KEY], (sess) => {
            if (!extensionContextLive()) {
              stopPolling();
              return;
            }
            const dismissed = !!sess[DISMISS_KEY];
            const payload = {
              [COUNT_KEY]: n ?? 0,
              [PATH_KEY]: path,
              [UPDATED_KEY]: Date.now(),
            };
            if (autoModerateOn && !dismissed && n != null && n > 0) {
              payload[PENDING_KEY] = n;
            }
            session.set(payload);
          });
        } catch (err) {
          if (isContextInvalidatedError(err)) stopPolling();
        }
      });
    });
  }

  if (extensionContextLive()) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== READ_MSG) return undefined;
      if (!extensionContextLive()) {
        stopPolling();
        return undefined;
      }
      const count = readCountIncludingShadowDom();
      publishSession();
      try {
        sendResponse({ count: count ?? 0 });
      } catch (err) {
        if (isContextInvalidatedError(err)) stopPolling();
      }
      return true;
    });
  }

  publishSession();
  pollInterval = setInterval(publishSession, 1500);
  window.addEventListener('pagehide', () => stopPolling());
})();