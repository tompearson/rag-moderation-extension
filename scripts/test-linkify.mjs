import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  moderationTextToLinkedHtml,
  stripMarkdownLinksToPlainText,
} from '../lib/moderationLinkedHtml.js';

const BUSINESS_BREAKDOWN =
  'This post offers a service with a commercial claim ("the cheapest on the app") and an explicit call to action ("msg me with the project details and lets make it happen"). Posts from personal accounts that function as business listings should be made from a free Nextdoor Business Page. This helps keep the main feed focused on neighbor-to-neighbor interactions. For more information, please see our [Business posting guidelines](https://help.nextdoor.com/s/article/Business-posting-guidelines?language=en_US).';

const html = moderationTextToLinkedHtml(BUSINESS_BREAKDOWN);
assert.match(html, /<a href="https:\/\/help\.nextdoor\.com\/s\/article\/Business-posting-guidelines/);
assert.match(html, />Business posting guidelines<\/a>/);
assert.doesNotMatch(html, /\[Business posting guidelines\]\(/);

const plain = stripMarkdownLinksToPlainText(BUSINESS_BREAKDOWN);
assert.doesNotMatch(plain, /\[Business posting guidelines\]/);
assert.match(plain, /Business posting guidelines/);
assert.doesNotMatch(plain, /help\.nextdoor\.com/);

const xss = moderationTextToLinkedHtml('Hello <script>alert(1)</script> [x](https://example.com/a)');
assert.doesNotMatch(xss, /<script/i);
assert.match(xss, /&lt;script&gt;/);

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const universalCases = join(
  extRoot,
  '..',
  'community-moderation-tool',
  'Moderation-Tool-Universal',
  'tests',
  'hyperlink-validation',
  'guideline-hyperlink-test-cases.json',
);
if (existsSync(universalCases)) {
  const { testCases } = JSON.parse(readFileSync(universalCases, 'utf8'));
  const sample = testCases.find((t) => t.id === 'HLT001');
  if (sample?.decisionBreakdown) {
    const out = moderationTextToLinkedHtml(sample.decisionBreakdown);
    assert.match(out, /<a href="/);
    assert.doesNotMatch(out, /\]\(https?:/);
  }
}

assert.match(
  readFileSync(join(extRoot, 'lib', 'linkify.js'), 'utf8'),
  /^\/\/ Vendored from Moderation-Tool-Universal\/utils\/linkify\.js/,
);

console.log('test-linkify: ok');
