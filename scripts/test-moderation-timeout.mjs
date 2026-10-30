import {
  DEFAULT_MODERATE_TIMEOUT_SEC,
  parseModerateTimeoutSec,
  moderateTimeoutMs,
} from '../lib/moderationTimeout.js';

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

assert(DEFAULT_MODERATE_TIMEOUT_SEC === 45, 'default is 45 seconds');
assert(parseModerateTimeoutSec(45) === 45, '45 ok');
assert(parseModerateTimeoutSec('90') === 90, 'string 90');
assert(parseModerateTimeoutSec(5) === 15, 'clamps min');
assert(parseModerateTimeoutSec(999) === 300, 'clamps max');
assert(parseModerateTimeoutSec('nope') === 45, 'invalid uses default');
assert(moderateTimeoutMs(45) === 45000, 'ms conversion');

if (failed) process.exit(1);
console.log('OK — moderation timeout tests passed');
