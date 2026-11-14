import assert from 'node:assert/strict';
import {
  moderationCaptureTabId,
  resolvePickTabIdForSidePanel,
  isFocusedTabNextdoor,
  NEXTDOOR_REQUIRED_MSG,
} from '../lib/moderationDomain.js';

assert.equal(
  moderationCaptureTabId({ id: 1, url: 'https://nextdoor.com/p/abc' }),
  1,
  'nextdoor post',
);
assert.equal(
  moderationCaptureTabId({ id: 2, url: 'https://www.nextdoor.com/news_feed/' }),
  2,
  'news feed',
);
assert.equal(
  moderationCaptureTabId({ id: 3, url: 'https://example.com/' }),
  null,
  'non-nextdoor',
);
assert.equal(moderationCaptureTabId({ id: 4, url: 'chrome://newtab' }), null, 'chrome scheme');

assert.equal(
  resolvePickTabIdForSidePanel({ id: 10, url: 'https://nextdoor.com/news_feed/' }),
  10,
  'active nextdoor',
);
assert.throws(
  () => resolvePickTabIdForSidePanel({ id: 11, url: 'https://mail.google.com/' }),
  (err) => err instanceof Error && err.message === NEXTDOOR_REQUIRED_MSG,
  'rejects active non-nextdoor',
);
assert.equal(
  isFocusedTabNextdoor({ id: 12, url: 'https://nextdoor.com/p/x' }),
  true,
);
assert.equal(isFocusedTabNextdoor({ id: 13, url: 'https://gemini.google.com/' }), false);

console.log('OK — moderation domain tests passed');