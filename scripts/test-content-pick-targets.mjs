import {
  captureTargetForElement,
  extractTextFromCaptureTarget,
  isNextdoorPrimaryText,
  mergeAnchorHrefsIntoText,
} from '../lib/contentPickTargets.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Minimal HTMLElement stubs for unit tests (no jsdom). */
class MockHTMLElement {
  constructor(tag, classNames, text) {
    this.tagName = tag.toUpperCase();
    this.parentElement = null;
    this.textContent = text;
    this.innerText = text;
    this.offsetHeight = 20;
    const classes = new Set(classNames);
    this.classList = {
      contains: (c) => classes.has(c),
      [Symbol.iterator]: function* () {
        yield* classes;
      },
    };
  }
  getAttribute() {
    return null;
  }
  hasAttribute() {
    return false;
  }
  querySelectorAll() {
    return [];
  }
}
globalThis.HTMLElement = MockHTMLElement;
globalThis.document = { body: {} };

const article = new MockHTMLElement('article', [], 'card');
const linkify = new MockHTMLElement(
  'span',
  ['link_style-provider-base__owgxbf0', 'link_style-provider-primary__owgxbf1', 'Linkify'],
  'What are some good trunk or treats tonight?',
);
linkify.parentElement = article;

assert(isNextdoorPrimaryText(linkify), 'Linkify span detected');

const target = captureTargetForElement(linkify);
assert(target === linkify, 'prefers Linkify over article');

const text = extractTextFromCaptureTarget(target);
assert(text === 'What are some good trunk or treats tonight?', 'extracts title text');

const commentRoot = {
  querySelectorAll(sel) {
    if (sel !== 'a[href]') return [];
    return [
      {
        getAttribute: (n) => (n === 'href' ? 'https://saintmarks.org/justice/refugees/' : null),
        innerText: 'What does the Bible say about refugees?',
        textContent: 'What does the Bible say about refugees?',
      },
    ];
  },
};
const body =
  'Jeff What about what Jesus said?\nIf you need reminding:\nWhat does the Bible say about refugees?';
const withUrl = mergeAnchorHrefsIntoText(commentRoot, body, 'https://nextdoor.com/');
assert(withUrl.includes('https://saintmarks.org/justice/refugees/'), 'appends href when URL not in text');
const alreadyHas = mergeAnchorHrefsIntoText(
  commentRoot,
  `${body}\nhttps://saintmarks.org/justice/refugees/`,
  'https://nextdoor.com/',
);
assert(alreadyHas === `${body}\nhttps://saintmarks.org/justice/refugees/`, 'skip duplicate href');

console.log('OK — content pick target tests passed');
