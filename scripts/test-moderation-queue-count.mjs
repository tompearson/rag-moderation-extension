#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  isReportedContentNavLabel,
  parseModerationQueueCountText,
  readModerationQueueCountFromDom,
} from '../lib/moderationQueueCount.js';

assert.equal(parseModerationQueueCountText('3'), 3);
assert.equal(parseModerationQueueCountText('99+'), 99);
assert.equal(parseModerationQueueCountText('0'), null);
assert.equal(parseModerationQueueCountText(''), null);

const fixture = {
  querySelector(sel) {
    if (sel === 'span[data-block="3"]') {
      return { textContent: '3' };
    }
    return null;
  },
  querySelectorAll() {
    return [];
  },
};

assert.equal(readModerationQueueCountFromDom(fixture), 3);

assert.equal(isReportedContentNavLabel('Reported content'), true);

const row = {
  querySelectorAll(sel) {
    if (sel.includes('Badge')) {
      return [{ textContent: '3' }];
    }
    return [];
  },
};

const sidebarFixture = {
  querySelector() {
    return null;
  },
  querySelectorAll(sel) {
    if (sel === 'a, button, [role="menuitem"], [role="link"]') {
      return [
        {
          textContent: 'Reported content',
          getAttribute: () => '/moderation_feed/',
          closest: () => row,
          parentElement: row,
        },
      ];
    }
    return [];
  },
};

assert.equal(readModerationQueueCountFromDom(sidebarFixture), 3);

console.log('OK — moderation queue count tests passed');