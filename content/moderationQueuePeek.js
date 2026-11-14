/**
 * Injected on nextdoor.com/news_feed to read the lead moderation queue badge count.
 */
(function () {
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
    return t.includes('reported content') || t === 'reported';
  }

  function countFromBadges(root) {
    if (!root) return null;
    const badges = root.querySelectorAll('[class*="Badge"], span[data-block]');
    for (const badge of badges) {
      const n = parseCount(badge.textContent);
      if (n != null) return n;
    }
    return null;
  }

  function readCount() {
    const navCandidates = document.querySelectorAll('a, button, [role="menuitem"], [role="link"]');
    for (const el of navCandidates) {
      const label = el.textContent || '';
      const href = el.getAttribute('href') || '';
      const hrefMatch = /moderation_feed|reported/i.test(href);
      if (!isReportedContentLabel(label) && !hrefMatch) continue;

      const row = el.closest('li') || el.closest('[data-testid]') || el.parentElement;
      const n =
        countFromBadges(row) || countFromBadges(el.parentElement) || countFromBadges(el);
      if (n != null) return n;
    }

    const blockBadge = document.querySelector('span[data-block="3"]');
    if (blockBadge) {
      const fromBlock = parseCount(blockBadge.textContent);
      if (fromBlock != null) return fromBlock;
    }

    const numberBadges = document.querySelectorAll('[class*="Badge_variant_number"]');
    for (const el of numberBadges) {
      const n = parseCount(el.textContent);
      if (n != null) return n;
    }

    const moderationLinks = document.querySelectorAll('a[href*="moderation_feed"]');
    for (const link of moderationLinks) {
      const n = countFromBadges(link);
      if (n != null) return n;
    }

    return null;
  }

  window.__ragModerationQueuePeek = readCount;
})();