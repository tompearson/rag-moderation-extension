import { marked } from 'marked';

/** Same-origin guide paths (works on production host). */
export const EXTENSION_GUIDE_NAV = [
  { href: '/extension/install-chrome-extension', label: 'Install' },
  { href: '/extension/get-gemini-api-key', label: 'Gemini key' },
  { href: '/extension/privacy', label: 'Privacy' },
];

export const EXTENSION_GUIDE_PAGE_CSS = `
  :root {
    --bg-page: #f4f5f2;
    --bg-card: #ffffff;
    --green: #00b140;
    --green-dark: #008a33;
    --green-soft: #e6f6ec;
    --text: #2d2d2d;
    --text-muted: #6b6f66;
    --border: #e2e6de;
    --shadow: 0 2px 12px rgba(45, 45, 45, 0.06);
    --radius: 16px;
    --font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 0 0 48px;
    font-family: var(--font);
    font-size: 16px;
    line-height: 1.6;
    color: var(--text);
    background: var(--bg-page);
  }

  .site-header {
    background: var(--green);
    color: #fff;
    padding: 14px 16px 16px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
  }

  .site-header__inner {
    max-width: 42rem;
    margin: 0 auto;
  }

  .site-header__title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .site-header__tagline {
    margin: 4px 0 0;
    font-size: 0.8125rem;
    opacity: 0.92;
    font-weight: 500;
  }

  .site-nav {
    max-width: 42rem;
    margin: 12px auto 0;
    padding: 0 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    font-size: 0.8125rem;
  }

  .site-nav a {
    color: var(--green-dark);
    font-weight: 600;
    text-decoration: none;
  }

  .site-nav a:hover {
    text-decoration: underline;
  }

  .site-nav a[aria-current="page"] {
    color: var(--text);
    text-decoration: none;
    cursor: default;
  }

  main {
    max-width: 42rem;
    margin: 20px auto 0;
    padding: 28px 24px 32px;
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    border-top: 4px solid var(--green);
    box-shadow: var(--shadow);
  }

  h1 {
    font-size: 1.65rem;
    margin: 0 0 1rem;
    line-height: 1.25;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 1.2rem;
    margin: 2rem 0 0.75rem;
    color: var(--text);
    border-bottom: 2px solid var(--green-soft);
    padding-bottom: 0.35rem;
  }

  h2#toc + ul,
  main > h2:first-of-type + ul {
    list-style: none;
    padding: 12px 14px;
    margin: 0 0 1.25rem;
    background: var(--green-soft);
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  h2#toc + ul a,
  main > h2:first-of-type + ul a {
    font-weight: 600;
  }

  h3 {
    font-size: 1.05rem;
    margin: 1.25rem 0 0.5rem;
    color: var(--text);
  }

  p { margin: 0.75rem 0; }

  .guide-preface-card {
    margin: 0 0 1.35rem;
    padding: 16px 18px;
    background: var(--bg-page);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: var(--shadow);
  }

  .guide-preface-card__label {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--green-dark);
  }

  .guide-preface-card p:last-child {
    margin-bottom: 0;
  }

  main > p:has(strong:first-child):not(:has(strong:only-child)),
  blockquote {
    margin: 1rem 0;
    padding: 12px 14px;
    background: var(--green-soft);
    border-left: 4px solid var(--green);
    border-radius: 0 8px 8px 0;
  }

  blockquote p { margin: 0.35rem 0; }

  ul, ol {
    margin: 0.75rem 0;
    padding-left: 0;
    list-style: none;
  }

  ul { padding-left: 1.35rem; list-style: disc; }

  main > ol {
    counter-reset: guide-step;
  }

  main > ol > li {
    counter-increment: guide-step;
    position: relative;
    margin: 0.65rem 0;
    padding-left: 2.25rem;
  }

  main > ol > li::before {
    content: counter(guide-step);
    position: absolute;
    left: 0;
    top: 0.1em;
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 50%;
    background: var(--green);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1.55rem;
    text-align: center;
  }

  /* Install guide: sub-steps under main step 6 only */
  main > ol > li > ol {
    counter-reset: guide-substep;
    margin: 0.65rem 0 0.25rem;
  }

  main > ol > li > ol > li {
    counter-increment: guide-substep;
    position: relative;
    padding-left: 5.35rem;
    margin: 0.5rem 0;
  }

  main > ol > li > ol > li::before {
    content: "Step " counter(guide-substep);
    position: absolute;
    left: 0;
    top: 0.08em;
    width: auto;
    height: auto;
    line-height: 1.45;
    font-size: 0.92rem;
    font-weight: 700;
    background: none;
    border: none;
    border-radius: 0;
    color: var(--green-dark);
    text-align: left;
  }

  main > ol > li > ol > li > p {
    margin-left: 0;
  }

  li { margin: 0.35rem 0; }

  main > ol > li > ol > li img {
    margin-left: 0;
  }

  a {
    color: var(--green-dark);
    font-weight: 500;
  }

  a:hover { color: var(--green); }

  a[target="_blank"]::after {
    content: ' ↗';
    font-size: 0.75em;
    font-weight: 600;
  }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5rem 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92rem;
    margin: 1rem 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }

  th, td {
    border: 1px solid var(--border);
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--green-soft);
    font-weight: 700;
    color: var(--text);
  }

  code {
    font-size: 0.88em;
    background: var(--green-soft);
    color: var(--green-dark);
    padding: 0.12em 0.35em;
    border-radius: 4px;
  }

  main img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 1rem 0 1.35rem;
    border-radius: 10px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }

  main ol > li > p {
    margin: 0.45rem 0 0.45rem 1.25rem;
  }

  .site-footer {
    max-width: 42rem;
    margin: 20px auto 0;
    padding: 0 16px;
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.5;
  }

  .site-footer__line { margin: 0.35rem 0; }

  @media (max-width: 480px) {
    main { margin-left: 12px; margin-right: 12px; padding: 22px 18px 28px; }
  }
`.trim();

function externalLinkRenderer() {
  const renderer = new marked.Renderer();
  renderer.link = ({ href, title, text }) => {
    const isExternal =
      typeof href === 'string' &&
      (href.startsWith('http://') || href.startsWith('https://')) &&
      !href.startsWith('https://www.airesearchdog.net');
    const rel = isExternal ? ' rel="noopener noreferrer"' : '';
    const target = isExternal ? ' target="_blank"' : '';
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr}${target}${rel}>${text}</a>`;
  };
  return renderer;
}

/**
 * @param {string | undefined} pagePath e.g. /extension/privacy
 * @param {boolean} [showGuideNav]
 */
function renderSiteHeader(pagePath, showGuideNav = true) {
  const navBlock = showGuideNav
    ? `<nav class="site-nav" aria-label="Extension guides">
      ${EXTENSION_GUIDE_NAV.map(({ href, label }) => {
        const current = pagePath && href === pagePath;
        if (current) {
          return `<a href="${href}" aria-current="page">${label}</a>`;
        }
        return `<a href="${href}">${label}</a>`;
      }).join('\n      ')}
  </nav>`
    : '';

  return `<header class="site-header">
    <div class="site-header__inner">
      <p class="site-header__title">RAG Moderation Assistant</p>
      <p class="site-header__tagline">Extension help for community moderators</p>
    </div>
  </header>
  ${navBlock}`;
}

/**
 * @param {string} footerText
 */
function renderSiteFooter(footerText) {
  return `<footer class="site-footer">
    <p class="site-footer__line">${footerText}</p>
    <p class="site-footer__line">Not affiliated with Nextdoor, Inc.</p>
  </footer>`;
}

/**
 * @param {object} opts
 * @param {string} opts.pageTitle
 * @param {string} opts.footerText
 * @param {string} opts.markdown
 * @param {string} [opts.pagePath] — highlights active item in guide nav
 * @param {boolean} [opts.showGuideNav] — Install / Gemini key / Privacy links under header (default true)
 * @param {(md: string) => string} [opts.preprocessMarkdown]
 * @param {(html: string) => string} [opts.postprocessBodyHtml]
 */
export function renderExtensionGuideHtml(opts) {
  const preprocess = opts.preprocessMarkdown ?? ((s) => s);
  const postprocess = opts.postprocessBodyHtml ?? ((s) => s);

  marked.setOptions({ gfm: true, renderer: externalLinkRenderer() });

  let bodyHtml = marked.parse(preprocess(opts.markdown));
  bodyHtml = postprocess(bodyHtml);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.pageTitle}</title>
  <style>${EXTENSION_GUIDE_PAGE_CSS}</style>
</head>
<body>
  ${renderSiteHeader(opts.pagePath, opts.showGuideNav !== false)}
  <main>
${bodyHtml}
  </main>
  ${renderSiteFooter(opts.footerText)}
</body>
</html>
`;
}
