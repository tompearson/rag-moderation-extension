import assert from 'node:assert/strict';
import {
  SHARED_POOL_MODERATION_LIMIT,
  SHARED_POOL_STORAGE_KEY,
  clampSharedPoolUsedCount,
  getSharedPoolRemaining,
  usesSharedPoolForModeration,
  sharedPoolLimitExceededMessage,
  isSharedPoolLimitExceededMessage,
  formatSharedPoolRemainingLabel,
} from '../lib/sharedPoolQuota.js';
import {
  sharedPoolActiveStatusMessage,
  sharedPoolByokOffBadgeLabel,
  buildGeminiKeyRemoveConfirmMessage,
} from '../lib/geminiByok.js';

assert.equal(SHARED_POOL_MODERATION_LIMIT, 5);
assert.equal(clampSharedPoolUsedCount(-1), 0);
assert.equal(clampSharedPoolUsedCount(99), 5);
assert.equal(getSharedPoolRemaining(0), 5);
assert.equal(getSharedPoolRemaining(5), 0);
assert.equal(getSharedPoolRemaining(3), 2);

const key = 'A'.repeat(40);
assert.equal(usesSharedPoolForModeration({ geminiApiKey: '' }), true);
assert.equal(usesSharedPoolForModeration({ geminiApiKey: key }), false);

assert.match(sharedPoolLimitExceededMessage(), /Save key/i);
assert.equal(isSharedPoolLimitExceededMessage(sharedPoolLimitExceededMessage()), true);
assert.equal(isSharedPoolLimitExceededMessage('Other error'), false);

assert.match(sharedPoolActiveStatusMessage(3), /3 of 5/);
assert.match(sharedPoolActiveStatusMessage(0), /no free moderations/i);
assert.match(sharedPoolActiveStatusMessage(), /Up to 5/);

assert.equal(sharedPoolByokOffBadgeLabel(), 'Your key · Off');

const removeZero = buildGeminiKeyRemoveConfirmMessage(0);
assert.equal(removeZero.exhausted, true);
assert.match(removeZero.leadHtml, /no free shared moderations/i);
assert.match(removeZero.personalKeyHtml, /keeping your personal Gemini/i);

const removeThree = buildGeminiKeyRemoveConfirmMessage(3);
assert.equal(removeThree.exhausted, false);
assert.match(removeThree.leadHtml, /3 of 5/);
assert.equal(removeThree.cancelLabel, 'Keep using my key');

assert.match(formatSharedPoolRemainingLabel(3), /3 of 5/);
assert.match(formatSharedPoolRemainingLabel(0), /no moderations left/i);

assert.equal(SHARED_POOL_STORAGE_KEY, 'sharedPoolModerationsUsed');

console.log('OK — shared pool quota tests passed');
