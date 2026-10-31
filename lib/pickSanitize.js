import { textIncludesUrl } from './urlInText.js';

/** @param {string} url */
export function isExternalModerationUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'nextdoor.com' || host.endsWith('.nextdoor.com')) return false;
  } catch {
    return false;
  }
  return /^https?:\/\//i.test(url);
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizePickedModerationText(text) {
  let out = String(text).replace(/\r/g, '');

  // Split URLs glued to the next word (e.g. .../immigrants/What does)
  out = out.replace(/(https:\/\/[^\s]*?[a-z0-9\/])([A-Z][a-zA-Z])/g, '$1\n$2');

  /** @type {string[]} */
  const lines = [];
  /** @type {Set<string>} */
  const seenUrls = new Set();

  for (const rawLine of out.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }

    if (/^(Like|Helpful|Reply|Edited|Author|\d+h|\d+m|\d+d|\d+\s*comments?)$/i.test(line)) {
      continue;
    }
    if (/^Post details$/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;

    if (/^https?:\/\//i.test(line)) {
      if (!isExternalModerationUrl(line)) continue;
      const norm = line.replace(/\/$/, '');
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);
      lines.push(line);
      continue;
    }

    if (/^https?:\/\//i.test(line) === false && line.includes('http')) {
      // mixed line — keep but strip internal nextdoor links inline
      const cleaned = line
        .replace(/https?:\/\/[^\s]*nextdoor\.com[^\s]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (cleaned) lines.push(cleaned);
      continue;
    }

    lines.push(line);
  }

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function shouldIncludeAnchorHref(url) {
  return isExternalModerationUrl(url);
}
