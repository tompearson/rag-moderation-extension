/** @type {RegExp} */
export const HTTP_URL_IN_TEXT_RE = /\bhttps?:\/\/[^\s<>"')\]\u2019\u201d]+/gi;

/**
 * @param {string | null | undefined} s
 * @returns {string[]}
 */
export function extractHttpUrlsFromString(s) {
  if (!s) return [];
  /** @type {string[]} */
  const out = [];
  /** @type {Set<string>} */
  const seen = new Set();
  for (const match of String(s).matchAll(HTTP_URL_IN_TEXT_RE)) {
    const raw = match[0].replace(/[.,;:!?]+$/, '');
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

/**
 * @param {string} text
 * @param {string} url
 * @returns {boolean}
 */
export function textIncludesUrl(text, url) {
  if (!url) return false;
  const variants = [url, url.replace(/\/$/, ''), `${url}/`];
  return variants.some((v) => v.length > 12 && text.includes(v));
}

/**
 * Insert URLs that appear in `textContent` but not in captured text, near the preceding snippet.
 * @param {string} text
 * @param {string} textContent
 * @param {string[]} missingUrls
 * @returns {string}
 */
export function insertMissingUrlsInDocumentOrder(text, textContent, missingUrls) {
  let result = text;
  for (const url of missingUrls) {
    if (textIncludesUrl(result, url)) continue;

    const idx = textContent.indexOf(url);
    if (idx < 0) {
      result = `${result}\n${url}`;
      continue;
    }

    const before = textContent.slice(Math.max(0, idx - 120), idx).trim();
    const anchor = before.slice(-48);
    if (anchor.length >= 8) {
      const pos = result.indexOf(anchor);
      if (pos >= 0) {
        const insertAt = pos + anchor.length;
        result = `${result.slice(0, insertAt)}\n${url}${result.slice(insertAt)}`;
        continue;
      }
    }

    result = `${result}\n${url}`;
  }
  return result.trim();
}
