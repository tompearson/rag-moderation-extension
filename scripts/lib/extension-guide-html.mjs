import { marked } from 'marked';

/** Same-origin legal paths (footer on every extension guide page). */
export const EXTENSION_GUIDE_FOOTER_PATHS = {
  privacy: '/extension/privacy',
  terms: '/extension/terms',
};

/** Linked from Related guides sections in extension docs. */
export const EXTENSION_AI_GENERATED_ANALYSIS_PATH = '/extension/important-ai-generated-analysis';

/** Top-level documentation index (public/extension/index.html). */
export const EXTENSION_DOCS_HOME_PATH = '/extension/guides';

/** Same-origin guide paths (works on production host). */
export const EXTENSION_GUIDE_NAV = [
  { href: EXTENSION_DOCS_HOME_PATH, label: 'All guides' },
  { href: '/extension/install-chrome-extension', label: 'Install' },
  { href: '/extension/get-gemini-api-key', label: 'Gemini key' },
  { href: '/extension/privacy', label: 'Privacy' },
];

/** All published /extension/* guide pages (footer site map). */
export const EXTENSION_GUIDE_SITEMAP = [
  { href: EXTENSION_DOCS_HOME_PATH, label: 'Documentation home' },
  { href: '/extension/install-chrome-extension', label: 'Install (Web Store)' },
  { href: '/extension/install-chrome-extension-developer', label: 'Install (developer)' },
  { href: '/extension/get-latest-extension', label: 'Get latest ZIP' },
  { href: '/extension/how-to-moderate-user-posts', label: 'How to moderate' },
  { href: '/extension/how-to-test-extension', label: 'How to test' },
  { href: '/extension/visual-moderation-step-by-step', label: 'Visual walkthrough' },
  { href: '/extension/get-gemini-api-key', label: 'Gemini API key' },
  { href: '/extension/important-ai-generated-analysis', label: 'AI-generated notice' },
  { href: '/extension/contact', label: 'Contact' },
  { href: '/extension/privacy', label: 'Privacy policy' },
  { href: '/extension/terms', label: 'Terms of use' },
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

  .guide-background-fold {
    margin: 0 0 1.25rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg-page);
    overflow: hidden;
  }

  .guide-background-fold > summary {
    padding: 12px 16px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
    color: var(--green-dark);
    user-select: none;
  }

  .guide-background-fold > summary::-webkit-details-marker {
    display: none;
  }

  .guide-background-fold > summary::before {
    content: '';
    display: inline-block;
    width: 0.45em;
    height: 0.45em;
    margin-right: 10px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.15s ease;
    vertical-align: 0.12em;
  }

  .guide-background-fold[open] > summary::before {
    transform: rotate(45deg);
    vertical-align: 0.05em;
  }

  .guide-background-fold__inner {
    padding: 0 16px 16px;
    border-top: 1px solid var(--border);
  }

  .guide-background-fold__inner > :first-child {
    margin-top: 0.85rem;
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

  .guide-image-expand {
    display: block;
    width: 100%;
    margin: 1rem 0 1.35rem;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
    text-align: left;
    border-radius: 10px;
  }

  .guide-image-expand:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 3px;
  }

  main img,
  .guide-image-expand img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0;
    border-radius: 10px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
  }

  a.guide-image-nav {
    display: inline-block;
    margin: 1rem 0 1.35rem;
    border-radius: 10px;
    text-decoration: none;
  }

  a.guide-image-nav img {
    margin: 0;
  }

  a.guide-image-nav:hover img {
    border-color: var(--green);
  }

  .guide-image-lightbox {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    background: rgba(15, 23, 42, 0.92);
  }

  .guide-image-lightbox.hidden {
    display: none;
  }

  .guide-image-lightbox__img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border: none;
    border-radius: 0;
    box-shadow: none;
    margin: 0;
  }

  .guide-image-lightbox__close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 1;
    width: 44px;
    height: 44px;
    padding: 0;
    font-size: 1.75rem;
    line-height: 1;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    cursor: pointer;
  }

  .guide-image-lightbox__close:hover {
    background: rgba(255, 255, 255, 0.2);
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

  .site-footer__legal a {
    color: var(--green-dark);
    font-weight: 600;
  }

  .site-footer__legal a:hover {
    color: var(--green);
  }

  .site-footer__sitemap {
    margin: 1rem 0 0.65rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--border);
    text-align: left;
  }

  .site-footer__sitemap-title {
    margin: 0 0 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
    text-align: center;
  }

  .site-footer__sitemap ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    justify-content: center;
    font-size: 0.78rem;
  }

  .site-footer__sitemap a {
    color: var(--green-dark);
    font-weight: 600;
    text-decoration: none;
  }

  .site-footer__sitemap a:hover {
    text-decoration: underline;
    color: var(--green);
  }

  .site-footer__sitemap [aria-current="page"] {
    color: var(--text-muted);
    font-weight: 600;
    cursor: default;
  }

  @media (max-width: 480px) {
    main { margin-left: 12px; margin-right: 12px; padding: 22px 18px 28px; }
  }

  /* Visual walkthrough: screenshots are ~1024px wide — use a wider column than default 42rem */
  body.guide-page--walkthrough {
    --guide-content-max: 64rem;
  }

  body.guide-page--walkthrough .site-header__inner,
  body.guide-page--walkthrough .site-nav,
  body.guide-page--walkthrough main,
  body.guide-page--walkthrough .site-footer {
    max-width: var(--guide-content-max);
  }

  body.guide-page--walkthrough .guide-image-expand img {
    width: 100%;
  }
`.trim();

/** @param {string} s */
function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function extensionGuideMarkdownRenderer() {
  const renderer = new marked.Renderer();
  renderer.link = ({ href, title, text }) => {
    const isExternal =
      typeof href === 'string' &&
      (href.startsWith('http://') || href.startsWith('https://')) &&
      !href.startsWith('https://www.airesearchdog.net');
    const isGuideImage =
      typeof href === 'string' &&
      (/^\/extension\/images\//.test(href) || /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(href));
    const openNewTab = isExternal || isGuideImage;
    const rel = openNewTab ? ' rel="noopener noreferrer"' : '';
    const target = openNewTab ? ' target="_blank"' : '';
    const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : '';
    return `<a href="${href}"${titleAttr}${target}${rel}>${text}</a>`;
  };
  renderer.image = ({ href, title, text }) => {
    const src = typeof href === 'string' ? href : '';
    const alt = text || title || 'Guide screenshot';
    const label = escapeHtmlAttr(alt);
    return `<button type="button" class="guide-image-expand" data-guide-image-src="${escapeHtmlAttr(src)}" aria-label="View full size: ${label}">
<img src="${src}" alt="${label}" loading="lazy">
</button>`;
  };
  return renderer;
}

const GUIDE_IMAGE_LIGHTBOX_HTML = `<div id="guide-image-lightbox" class="guide-image-lightbox hidden" role="dialog" aria-modal="true" aria-label="Full size image" hidden>
  <button type="button" class="guide-image-lightbox__close" aria-label="Close full size image">×</button>
  <img class="guide-image-lightbox__img" src="" alt="">
</div>`;

const GUIDE_IMAGE_LIGHTBOX_SCRIPT = `<script>
(function () {
  var lb = document.getElementById('guide-image-lightbox');
  if (!lb) return;
  var lbImg = lb.querySelector('.guide-image-lightbox__img');
  var closeBtn = lb.querySelector('.guide-image-lightbox__close');
  var lastFocus = null;

  function openLightbox(src, alt) {
    if (!src || !lbImg) return;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lbImg.src = src;
    lbImg.alt = alt || '';
    lb.classList.remove('hidden');
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeLightbox() {
    lb.classList.add('hidden');
    lb.hidden = true;
    if (lbImg) {
      lbImg.removeAttribute('src');
      lbImg.alt = '';
    }
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
    lastFocus = null;
  }

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest && e.target.closest('.guide-image-expand');
    if (!btn) return;
    var src = btn.getAttribute('data-guide-image-src');
    var img = btn.querySelector('img');
    openLightbox(src, img && img.alt ? img.alt : '');
  });

  closeBtn.addEventListener('click', closeLightbox);
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target === lbImg) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lb.hidden) closeLightbox();
  });
})();
</script>`;

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
 * @param {string | undefined} pagePath
 */
function renderSiteFooterSitemap(pagePath) {
  const items = EXTENSION_GUIDE_SITEMAP.map(({ href, label }) => {
    const current = pagePath && href === pagePath;
    if (current) {
      return `<li><span aria-current="page">${label}</span></li>`;
    }
    return `<li><a href="${href}">${label}</a></li>`;
  }).join('\n        ');
  return `<nav class="site-footer__sitemap" aria-label="Extension guides site map">
      <p class="site-footer__sitemap-title">Site map</p>
      <ul>
        ${items}
      </ul>
    </nav>`;
}

function renderSiteFooter(footerText, pagePath) {
  const { privacy, terms } = EXTENSION_GUIDE_FOOTER_PATHS;
  const onPrivacy = pagePath === privacy;
  const onTerms = pagePath === terms;
  const privacyLink = onPrivacy
    ? 'Privacy policy'
    : `<a href="${privacy}">Privacy policy</a>`;
  const termsLink = onTerms ? 'Terms of use' : `<a href="${terms}">Terms of use</a>`;

  return `<footer class="site-footer">
    <p class="site-footer__line">${footerText}</p>
    ${renderSiteFooterSitemap(pagePath)}
    <p class="site-footer__line site-footer__legal">${privacyLink} · ${termsLink}</p>
    <p class="site-footer__line">Not affiliated with Nextdoor, Inc.</p>
  </footer>`;
}

/**
 * Collapse intro content before an anchored h2 into a closed <details> block (h1 stays visible).
 * @param {string} html
 * @param {string} anchorId — value of id on the target h2 (e.g. google)
 * @param {string} [summaryLabel]
 */
export function wrapGuideBackgroundFold(html, anchorId, summaryLabel = 'Background') {
  const marker = `<h2 id="${anchorId}">`;
  const idx = html.indexOf(marker);
  if (idx === -1) return html;

  const before = html.slice(0, idx).trimEnd();
  const after = html.slice(idx);
  const h1Match = before.match(/^<h1>[\s\S]*?<\/h1>\s*/);
  if (!h1Match) return html;

  const h1 = h1Match[0].trimEnd();
  const intro = before.slice(h1Match[0].length).trim();
  if (!intro) return html;

  return `${h1}
<details class="guide-background-fold">
  <summary>${summaryLabel}</summary>
  <div class="guide-background-fold__inner">
${intro}
  </div>
</details>
${after}`;
}

/**
 * @param {object} opts
 * @param {string} opts.pageTitle
 * @param {string} opts.footerText
 * @param {string} opts.markdown
 * @param {string} [opts.pagePath] — highlights active item in guide nav
 * @param {boolean} [opts.showGuideNav] — Install / Gemini key / Privacy links under header (default true)
 * @param {string} [opts.bodyClass] — extra classes on `<body>` (e.g. guide-page--walkthrough)
 * @param {(md: string) => string} [opts.preprocessMarkdown]
 * @param {(html: string) => string} [opts.postprocessBodyHtml]
 */
export function renderExtensionGuideHtml(opts) {
  const preprocess = opts.preprocessMarkdown ?? ((s) => s);
  const postprocess = opts.postprocessBodyHtml ?? ((s) => s);

  marked.setOptions({ gfm: true, renderer: extensionGuideMarkdownRenderer() });

  let bodyHtml = marked.parse(preprocess(opts.markdown));
  bodyHtml = postprocess(bodyHtml);

  const bodyClass = opts.bodyClass ? ` class="${escapeHtmlAttr(opts.bodyClass)}"` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${opts.pageTitle}</title>
  <style>${EXTENSION_GUIDE_PAGE_CSS}</style>
</head>
<body${bodyClass}>
  ${renderSiteHeader(opts.pagePath, opts.showGuideNav !== false)}
  <main>
${bodyHtml}
  </main>
  ${renderSiteFooter(opts.footerText, opts.pagePath)}
  ${GUIDE_IMAGE_LIGHTBOX_HTML}
  ${GUIDE_IMAGE_LIGHTBOX_SCRIPT}
</body>
</html>
`;
}
