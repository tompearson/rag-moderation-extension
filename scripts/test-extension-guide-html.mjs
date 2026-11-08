import assert from 'node:assert/strict';
import {
  EXTENSION_GUIDE_PAGE_CSS,
  EXTENSION_GUIDE_NAV,
  renderExtensionGuideHtml,
  wrapGuideBackgroundFold,
} from './lib/extension-guide-html.mjs';

assert.match(EXTENSION_GUIDE_PAGE_CSS, /system-ui/, 'uses system font stack');
assert.match(EXTENSION_GUIDE_PAGE_CSS, /\.site-header/, 'neighborhood header');
assert.match(EXTENSION_GUIDE_PAGE_CSS, /--green:/, 'theme tokens');
assert.match(EXTENSION_GUIDE_PAGE_CSS, /\.guide-preface-card/, 'preface card');
assert.equal(EXTENSION_GUIDE_NAV.length, 3, 'guide nav links');

const html = renderExtensionGuideHtml({
  pageTitle: 'Test',
  footerText: 'Footer',
  pagePath: '/extension/privacy',
  markdown: '# Title\n\n**Note:** callout test.\n\n1. One\n2. Two',
});

assert.match(html, /site-header/, 'renders header');
assert.match(html, /aria-current="page">Privacy/, 'active nav');
assert.match(html, /Not affiliated with Nextdoor/, 'disclaimer');
assert.match(html, /site-footer__legal/, 'legal footer links');
assert.match(html, /href="\/extension\/terms">Terms of use/, 'terms link');
assert.match(html, /Privacy policy/, 'privacy footer (current page)');
assert.doesNotMatch(
  html,
  /site-footer__legal[\s\S]*important-ai-generated-analysis/,
  'no AI link in footer',
);
assert.match(html, /<main>/, 'main content');

const folded = wrapGuideBackgroundFold(
  '<h1>Title</h1>\n<p>Intro</p>\n<h2 id="google">Part 1</h2>\n<p>Body</p>',
  'google',
  'Background',
);
assert.match(folded, /<details class="guide-background-fold">/, 'background fold');
assert.match(folded, /<summary>Background<\/summary>/, 'summary label');
assert.doesNotMatch(folded, /<details[\s\S]*open/, 'collapsed by default');
assert.match(folded, /<h2 id="google">Part 1<\/h2>/, 'anchor section outside fold');

console.log('test-extension-guide-html: ok');
