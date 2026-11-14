import assert from 'node:assert/strict';
import {
  NEXTDOOR_NEWS_FEED_URL,
  isNextdoorHost,
  isNextdoorModerationFeedUrl,
  isNextdoorNewsFeedUrl,
  shouldAutoOpenNextdoorNewsFeed,
  shouldNavigateTabToNewsFeed,
} from '../lib/nextdoorFeedNav.js';

assert.equal(NEXTDOOR_NEWS_FEED_URL, 'https://nextdoor.com/news_feed/');

assert.equal(isNextdoorHost('https://nextdoor.com/p/123'), true);
assert.equal(isNextdoorHost('https://www.nextdoor.com/'), true);
assert.equal(isNextdoorHost('https://example.com/'), false);

assert.equal(isNextdoorNewsFeedUrl('https://nextdoor.com/news_feed'), true);
assert.equal(isNextdoorNewsFeedUrl('https://nextdoor.com/news_feed/'), true);
assert.equal(isNextdoorNewsFeedUrl('https://nextdoor.com/p/abc'), false);

assert.equal(isNextdoorModerationFeedUrl('https://nextdoor.com/moderation_feed/'), true);
assert.equal(isNextdoorModerationFeedUrl('https://nextdoor.com/news_feed/'), false);

assert.equal(shouldNavigateTabToNewsFeed('https://nextdoor.com/news_feed/'), false);
assert.equal(shouldNavigateTabToNewsFeed('https://nextdoor.com/moderation_feed/'), false);
assert.equal(shouldNavigateTabToNewsFeed('https://nextdoor.com/for_sale_and_free/'), true);
assert.equal(shouldNavigateTabToNewsFeed('https://nextdoor.com/p/abc'), true);
assert.equal(shouldNavigateTabToNewsFeed('https://www.google.com/'), true);
assert.equal(shouldNavigateTabToNewsFeed('chrome://newtab'), false);

assert.equal(shouldAutoOpenNextdoorNewsFeed('https://nextdoor.com/news_feed/'), false);
assert.equal(shouldAutoOpenNextdoorNewsFeed('https://nextdoor.com/for_sale_and_free/'), false);
assert.equal(shouldAutoOpenNextdoorNewsFeed('https://nextdoor.com/p/abc'), false);
assert.equal(shouldAutoOpenNextdoorNewsFeed('https://www.google.com/'), true);
assert.equal(shouldAutoOpenNextdoorNewsFeed('chrome://newtab'), false);

console.log('OK — nextdoor feed nav tests passed');