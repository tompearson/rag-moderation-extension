import { marked } from 'marked';

export const EXTENSION_GUIDE_PAGE_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px 16px 48px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    font-size: 16px;
    line-height: 1.6;
    color: #1e293b;
    background: #f8fafc;
  }
  main {
    max-width: 42rem;
    margin: 0 auto;
    padding: 28px 24px 32px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  }
  h1 { font-size: 1.65rem; margin: 0 0 1rem; line-height: 1.25; color: #0f172a; }
  h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }
  h3 { font-size: 1.05rem; margin: 1.25rem 0 0.5rem; color: #334155; }
  p { margin: 0.75rem 0; }
  ul, ol { margin: 0.75rem 0; padding-left: 1.35rem; }
  li { margin: 0.35rem 0; }
  a { color: #1d4ed8; }
  a:hover { text-decoration: none; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; margin: 1rem 0; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; }
  code { font-size: 0.88em; background: #f1f5f9; padding: 0.12em 0.35em; border-radius: 4px; }
  footer {
    max-width: 42rem;
    margin: 16px auto 0;
    font-size: 0.8rem;
    color: #64748b;
    text-align: center;
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
 * @param {object} opts
 * @param {string} opts.pageTitle
 * @param {string} opts.footerText
 * @param {string} opts.markdown
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
  <main>
${bodyHtml}
  </main>
  <footer>${opts.footerText}</footer>
</body>
</html>
`;
}
