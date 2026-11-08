import assert from 'node:assert/strict';
import {
  formatLastReportContactAppendix,
  serializeLastModerationReportForContact,
} from '../lib/lastModerationContactContext.js';

assert.equal(formatLastReportContactAppendix(null), '');

const withUrl = formatLastReportContactAppendix({
  moderationHistoryId: 'id-1',
  moderationReportUrl: null,
  apiOrigin: 'https://www.airesearchdog.net',
  decision: 'Keep',
  provider: 'NextDoor',
  analysisType: 'quick',
  viewUrl: 'https://www.airesearchdog.net/api/get-reports?action=view&id=id-1',
});
assert.match(withUrl, /Report ID: id-1/);
assert.match(withUrl, /Decision: Keep/);
assert.match(withUrl, /Full report: https/);

const serialized = serializeLastModerationReportForContact({
  moderationHistoryId: 'id-1',
  moderationReportUrl: null,
  apiOrigin: null,
  decision: 'Keep',
  provider: 'NextDoor',
  analysisType: 'quick',
  viewUrl: 'https://www.airesearchdog.net/api/get-reports?action=view&id=id-1',
});
assert.equal(serialized?.viewUrl?.includes('id-1'), true);

console.log('test-last-moderation-contact-context: ok');
