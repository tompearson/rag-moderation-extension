import { Window } from 'happy-dom';

import {
  expandRangeForInlineLinks,
  textFromSelectionRange,
} from '../lib/contentPickTargets.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const window = new Window({ url: 'https://nextdoor.com/' });
const { document } = window;
globalThis.document = document;
globalThis.Range = window.Range;
globalThis.Node = window.Node;
globalThis.HTMLElement = window.HTMLElement;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);

document.body.innerHTML = `
  <article class="post">
    <p class="Linkify">
      Come support our band. If you can't drop them off, PM me or email us at
      <a href="mailto:liberty10cents@gmail.com">liberty10cents@gmail.com</a>,
      and we will schedule a pick-up time!
    </p>
  </article>
`;

const p = document.querySelector('p');
const textNodes = [...p.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE);
const textBefore = textNodes[0];
const textAfter = textNodes[textNodes.length - 1];

const range = document.createRange();
range.setStart(textBefore, 0);
range.setEnd(textAfter, textAfter.length);

const expanded = expandRangeForInlineLinks(range);
const extracted = textFromSelectionRange(expanded);
assert(extracted.includes('liberty10cents@gmail.com'), 'drag-range walk includes email');
assert(extracted.includes('email us at'), 'includes text before link');
assert(extracted.includes('pick-up time'), 'includes text after link');

const httpRange = document.createRange();
httpRange.selectNodeContents(p);
const withUrl = textFromSelectionRange(httpRange);
assert(withUrl.includes('liberty10cents@gmail.com'), 'full paragraph includes mailto');

window.close();

console.log('OK — selection-range-links tests passed');