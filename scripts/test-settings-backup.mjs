#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  SETTINGS_BACKUP_FORMAT,
  SETTINGS_BACKUP_SCHEMA_VERSION,
  buildSettingsExport,
  normalizeImportedBackup,
  parseSettingsImportFile,
} from '../lib/settingsBackup.js';
import { DEFAULT_MODERATE_TIMEOUT_SEC } from '../lib/moderationTimeout.js';

const sampleSettings = {
  userLocation: 'Oregon',
  locationOnboardingComplete: true,
  envProfileId: 'production',
  customApiOrigin: '',
  moderatorId: 'mod-1',
  deviceId: 'dev-1',
  ragProvider: 'NextDoor-prompt-production-28-rag',
  moderateTimeoutSec: DEFAULT_MODERATE_TIMEOUT_SEC,
  reportEmailEnabled: true,
  reportShareRecipientEmail: 'user@example.com',
  reportEmailPromptComplete: true,
  geminiApiKey: 'AIzaSySECRET',
  geminiByokEnabled: true,
  reportOpenTabEnabled: true,
  autoNavEnabled: false,
  autoModerateEnabled: false,
};

const exported = buildSettingsExport(sampleSettings, {
  extensionVersion: '0.2.8',
  geminiRagStyleTest: true,
});

assert.equal(exported.format, SETTINGS_BACKUP_FORMAT);
assert.equal(exported.schemaVersion, SETTINGS_BACKUP_SCHEMA_VERSION);
assert.ok(!('geminiApiKey' in exported.settings));
assert.ok(!('autoNavEnabled' in exported.settings));
assert.ok(!('autoModerateEnabled' in exported.settings));
assert.equal(exported.settings.userLocation, 'Oregon');
assert.equal(exported.localPrefs.geminiRagStyleTest, true);

const fileJson = JSON.stringify(exported);
const reparsed = parseSettingsImportFile(fileJson);
assert.equal(reparsed.settings.userLocation, 'Oregon');
assert.equal(reparsed.settings.reportShareRecipientEmail, 'user@example.com');

const malicious = JSON.stringify({
  format: SETTINGS_BACKUP_FORMAT,
  schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION,
  settings: {
    ...exported.settings,
    geminiApiKey: 'AIzaSyHACK',
    envProfileId: 'local',
    customApiOrigin: 'http://127.0.0.1:3001',
  },
  localPrefs: { geminiRagStyleTest: false },
});

const storeNorm = normalizeImportedBackup(JSON.parse(malicious), { storeBuild: true });
assert.equal(storeNorm.settings.envProfileId, 'production');
assert.equal(storeNorm.settings.customApiOrigin, '');
assert.ok(!('geminiApiKey' in storeNorm.settings));

const devParse = parseSettingsImportFile(malicious);
assert.equal(devParse.settings.envProfileId, 'local');

const devNorm = normalizeImportedBackup(JSON.parse(malicious), { storeBuild: false });
assert.equal(devNorm.settings.envProfileId, 'local');
assert.equal(devNorm.settings.customApiOrigin, '');

const customMalicious = JSON.stringify({
  format: SETTINGS_BACKUP_FORMAT,
  schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION,
  settings: {
    ...exported.settings,
    envProfileId: 'custom',
    customApiOrigin: 'http://127.0.0.1:3001/',
  },
  localPrefs: { geminiRagStyleTest: false },
});
const devCustom = normalizeImportedBackup(JSON.parse(customMalicious), { storeBuild: false });
assert.equal(devCustom.settings.envProfileId, 'custom');
assert.equal(devCustom.settings.customApiOrigin, 'http://127.0.0.1:3001');

assert.throws(() => parseSettingsImportFile('not json'), /valid JSON/);
assert.throws(
  () => parseSettingsImportFile(JSON.stringify({ format: 'other', schemaVersion: 1, settings: {} })),
  /Not a RAG Moderation/,
);

console.log('OK — settings backup export/import');
