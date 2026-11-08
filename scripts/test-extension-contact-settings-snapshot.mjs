#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildExtensionContactOptionsSnapshot,
  describeGeminiKeyForContact,
} from '../lib/extensionContactSettingsSnapshot.js';
import { DEFAULT_MODERATE_TIMEOUT_SEC } from '../lib/moderationTimeout.js';

const fakeKey = `AIzaSy${'x'.repeat(35)}`;

const settings = {
  userLocation: 'Oregon',
  locationOnboardingComplete: true,
  envProfileId: 'production',
  customApiOrigin: '',
  moderatorId: 'chrome-ext-dev',
  deviceId: 'chrome-ext@local',
  ragProvider: 'NextDoor-prompt-production-28-rag',
  moderateTimeoutSec: DEFAULT_MODERATE_TIMEOUT_SEC,
  reportEmailEnabled: true,
  reportShareRecipientEmail: 'user@example.com',
  reportEmailPromptComplete: true,
  geminiApiKey: fakeKey,
  geminiByokEnabled: true,
  reportOpenTabEnabled: true,
};

const rows = buildExtensionContactOptionsSnapshot(settings, {
  analysisType: 'quick',
  badWordsEnabled: true,
});

assert.ok(rows.length >= 8);
const serialized = JSON.stringify(rows);
assert.doesNotMatch(serialized, /AIza/);
assert.ok(!serialized.includes(fakeKey));

const quotaRow = rows.find((r) => r.label === 'Gemini quota for moderation');
assert.ok(quotaRow);
assert.match(quotaRow.value, /Your Gemini key|BYOK/i);

const shared = describeGeminiKeyForContact({ ...settings, geminiByokEnabled: false });
assert.match(shared.moderationQuota, /Shared pool/i);

const sharedOff = buildExtensionContactOptionsSnapshot({
  ...settings,
  geminiApiKey: '',
  geminiByokEnabled: false,
});
const sharedRow = sharedOff.find((r) => r.label === 'Gemini quota for moderation');
assert.match(sharedRow.value, /Shared pool/i);

console.log('OK — extension contact options snapshot (no API key in payload)');
