/**
 * Parse Nextdoor lead queue badge text (DOM-independent, unit-tested).
 * @param {string | null | undefined} text
 * @returns {number | null}
 */
export function parseModerationQueueCountText(text) {
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

/**
 * @param {string | null | undefined} label
 * @returns {boolean}
 */
export function isReportedContentNavLabel(label) {
  const t = String(label ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return t.includes('reported content') || t === 'reported';
}

/**
 * @param {Element | null | undefined} root
 * @returns {number | null}
 */
function countFromBadgeCandidates(root) {
  if (!root) return null;
  const badges = root.querySelectorAll?.('[class*="Badge"], span[data-block]') ?? [];
  for (const badge of badges) {
    const n = parseModerationQueueCountText(badge.textContent);
    if (n != null) return n;
  }
  return null;
}

/**
 * @param {{ querySelector?: (sel: string) => Element | null; querySelectorAll?: (sel: string) => Iterable<Element> }} root
 * @returns {number | null}
 */
export function readModerationQueueCountFromDom(root) {
  if (!root?.querySelectorAll) return null;

  /** @type {Element[]} */
  const navCandidates = [];
  for (const el of root.querySelectorAll('a, button, [role="menuitem"], [role="link"]')) {
    navCandidates.push(el);
  }

  for (const el of navCandidates) {
    const label = el.textContent || '';
    const href = el.getAttribute?.('href') || '';
    const hrefMatch = /moderation_feed|reported/i.test(href);
    if (!isReportedContentNavLabel(label) && !hrefMatch) continue;

    const row = el.closest?.('li') ?? el.closest?.('[data-testid]') ?? el.parentElement;
    const n =
      countFromBadgeCandidates(row) ??
      countFromBadgeCandidates(el.parentElement) ??
      countFromBadgeCandidates(el);
    if (n != null) return n;
  }

  const blockBadge = root.querySelector?.('span[data-block="3"]');
  if (blockBadge) {
    const fromBlock = parseModerationQueueCountText(blockBadge.textContent);
    if (fromBlock != null) return fromBlock;
  }

  const numberBadges = root.querySelectorAll?.('[class*="Badge_variant_number"]') ?? [];
  for (const el of numberBadges) {
    const n = parseModerationQueueCountText(el.textContent);
    if (n != null) return n;
  }

  const moderationLinks = root.querySelectorAll?.('a[href*="moderation_feed"]') ?? [];
  for (const link of moderationLinks) {
    const n = countFromBadgeCandidates(link);
    if (n != null) return n;
  }

  return null;
}