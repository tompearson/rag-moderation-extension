#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  MODERATION_QUEUE_COUNT_SESSION_KEY,
  MODERATION_QUEUE_PATH_SESSION_KEY,
  MODERATION_QUEUE_UPDATED_SESSION_KEY,
  moderationQueueCountFromSession,
  newsFeedPathnameFromUrl,
} from '../lib/nextdoorModerationQueueSession.js';

assert.equal(newsFeedPathnameFromUrl('https://nextdoor.com/news_feed/'), '/news_feed');
assert.equal(newsFeedPathnameFromUrl('https://nextdoor.com/moderation_feed/'), null);

const session = {
  [MODERATION_QUEUE_COUNT_SESSION_KEY]: 3,
  [MODERATION_QUEUE_PATH_SESSION_KEY]: '/news_feed',
  [MODERATION_QUEUE_UPDATED_SESSION_KEY]: Date.now(),
};

assert.equal(
  moderationQueueCountFromSession('https://nextdoor.com/news_feed/', session),
  3,
);

console.log('OK — nextdoor moderation queue session tests passed');