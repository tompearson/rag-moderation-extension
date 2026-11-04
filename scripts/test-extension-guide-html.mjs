import assert from 'node:assert/strict';
import {
  EXTENSION_GUIDE_PAGE_CSS,
  EXTENSION_GUIDE_NAV,
  renderExtensionGuideHtml,
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
assert.match(html, /<main>/, 'main content');

console.log('test-extension-guide-html: ok');
