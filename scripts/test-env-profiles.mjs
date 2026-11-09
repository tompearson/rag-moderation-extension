#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolveApiConfig, resolveSettingsApiConfig } from '../lib/envProfiles.js';

assert.equal(resolveApiConfig('custom', '').apiOrigin, null);
assert.equal(resolveApiConfig('custom', '', { devLocalFallback: true }).apiOrigin, 'http://127.0.0.1:3001');
assert.equal(
  resolveSettingsApiConfig({ envProfileId: 'custom', customApiOrigin: '' }, false).apiOrigin,
  'http://127.0.0.1:3001',
);
assert.equal(
  resolveSettingsApiConfig({ envProfileId: 'custom', customApiOrigin: '' }, true).apiOrigin,
  null,
);

console.log('OK — env profile resolver tests passed');
