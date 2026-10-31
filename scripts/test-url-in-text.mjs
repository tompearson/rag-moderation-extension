import {
  extractHttpUrlsFromString,
  insertMissingUrlsInDocumentOrder,
  textIncludesUrl,
} from '../lib/urlInText.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const url = 'https://forms.cloud.microsoft/r/iNEeB4n1Xt';
const tc = `Thank you!\n${url}\nSURVEY [est. 15 mins]`;
const inner = 'Thank you!\nSURVEY [est. 15 mins] "States of Awe" — Fill out form';

const merged = insertMissingUrlsInDocumentOrder(inner, tc, [url]);
assert(merged.includes(url), 'inserts middle URL after anchor text');
assert(merged.indexOf(url) < merged.indexOf('SURVEY'), 'URL before survey line');

assert(extractHttpUrlsFromString(tc)[0] === url, 'extract url');
assert(textIncludesUrl(`${inner}\n${url}`, url), 'includes check');

const lynnUrl =
  'https://saintmarks.org/justice/renewing-our-covenant/what-does-the-bible-say-about-refugees-and-immigrants/';
const lynnBody =
  'Jeff What about what Jesus said? We are a christian nation right?\nWWJD?\nIf you need reminding:';
const lynnTc = `${lynnBody}\n${lynnUrl}\nWhat does the Bible say about immigrants and refugees?\nsaintmarks.org`;
const lynnMerged = insertMissingUrlsInDocumentOrder(lynnBody, lynnTc, [lynnUrl]);
assert(lynnMerged.includes('saintmarks.org/justice'), 'Lynn comment URL inserted before preview text');

console.log('OK — url-in-text tests passed');
