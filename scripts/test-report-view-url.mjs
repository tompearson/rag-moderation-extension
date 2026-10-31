import assert from 'node:assert/strict';
import {
  getReportViewOrigin,
  resolveReportViewUrl,
  hasSavedReportForActions,
  DEFAULT_PRODUCTION_REPORT_ORIGIN,
} from '../lib/reportViewUrl.js';

assert.equal(getReportViewOrigin('http://127.0.0.1:3001'), DEFAULT_PRODUCTION_REPORT_ORIGIN);
assert.equal(getReportViewOrigin('https://www.airesearchdog.net'), 'https://www.airesearchdog.net');

const built = resolveReportViewUrl({
  apiOrigin: 'http://127.0.0.1:3001',
  moderationHistoryId: 'abc-123',
});
assert.ok(built);
assert.match(built, /^https:\/\/www\.airesearchdog\.net\/api\/get-reports\?action=view&id=abc-123/);
assert.match(built, /layout=email/);
assert.match(built, /_t=\d+/);

const fromStored = resolveReportViewUrl({
  apiOrigin: 'https://www.airesearchdog.net',
  moderationReportUrl:
    'https://www.airesearchdog.net/api/get-reports?action=view&id=dead-beef&layout=business',
});
assert.ok(fromStored);
assert.match(fromStored, /layout=email/);
assert.match(fromStored, /id=dead-beef/);

assert.equal(hasSavedReportForActions({ moderationHistoryId: 'x' }), true);
assert.equal(hasSavedReportForActions({ decision: 'Keep' }), false);

console.log('test-report-view-url: ok');
