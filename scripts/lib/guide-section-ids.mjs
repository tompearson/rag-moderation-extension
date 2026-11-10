/**
 * Strip `## Title {#id}` → `## Title` before marked; restore `<h2 id="...">` after render.
 * @param {Array<[string, string]>} sections — [heading text, id]
 */
export function stripSectionIdMarkers(raw, sections) {
  let out = raw;
  for (const [title, id] of sections) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`^## ${escaped} \\{#${id}\\}`, 'm'), `## ${title}`);
  }
  return out;
}

/**
 * @param {string} html
 * @param {Array<[string, string]>} sections
 */
export function applySectionHeadingIds(html, sections) {
  let out = html;
  for (const [title, id] of sections) {
    out = out.replace(
      new RegExp(`<h2>${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\\/h2>`),
      `<h2 id="${id}">${title}</h2>`,
    );
  }
  return out;
}
