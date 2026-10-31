import { isExternalModerationUrl, sanitizePickedModerationText } from '../lib/pickSanitize.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(!isExternalModerationUrl('https://nextdoor.com/profile/foo'), 'blocks nextdoor');
assert(isExternalModerationUrl('https://www.kptv.com/foo'), 'allows news');

const noisy = `Post details
Jackson
https://nextdoor.com/neighborhood/jacksonor--hillsboro--or/
Helpful
Jeff
 It feels obvious and not needing to be stated but.....
https://www.kptv.com/2026/10/30/aclu-oregon-releases-video/
2
Helpful`;

const clean = sanitizePickedModerationText(noisy);
assert(!clean.includes('nextdoor.com'), 'strips nextdoor lines');
assert(clean.includes('It feels obvious'), 'keeps comment body');
assert(clean.includes('kptv.com'), 'keeps external url');
assert(!clean.includes('\n2\n'), 'strips reaction counts');

const glued =
  'If you need reminding:\nhttps://saintmarks.org/justice/refugees/What does the Bible say';
const fixed = sanitizePickedModerationText(glued);
assert(fixed.includes('refugees/\nWhat'), 'splits glued URL tail');

console.log('OK — pick sanitize tests passed');
