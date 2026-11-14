import { DEFAULT_PROFILE_ID, normalizeApiOrigin } from './envProfiles.js';
import { isStoreBuild } from './buildConfig.js';
import { notifyExtensionUiSync } from './extensionUiSync.js';
import { resolveStoredRagProviderId } from './ragProviders.js';
import { canonicalUsState } from './usStates.js';
import { parseModerateTimeoutSec } from './moderationTimeout.js';
import { STORAGE_KEYS, loadSettings, hasValidUserLocation } from './userSettings.js';
import { normalizeReportEmail } from './validateReportEmail.js';

export const SETTINGS_BACKUP_FORMAT = 'rag-moderation-extension-settings';
export const SETTINGS_BACKUP_SCHEMA_VERSION = 1;
export const GEMINI_RAG_STYLE_TEST_STORAGE = 'geminiRagStyleTest';

/** @type {(keyof typeof STORAGE_KEYS)[]} */
const EXPORT_SETTING_KEYS = [
  'userLocation',
  'locationOnboardingComplete',
  'envProfileId',
  'customApiOrigin',
  'moderatorId',
  'deviceId',
  'ragProvider',
  'moderateTimeoutSec',
  'reportEmailEnabled',
  'reportShareRecipientEmail',
  'reportEmailPromptComplete',
  'geminiByokEnabled',
];

/**
 * @param {Awaited<ReturnType<typeof loadSettings>>} settings
 * @param {{ extensionVersion?: string; geminiRagStyleTest?: boolean }} [opts]
 */
export function buildSettingsExport(settings, opts = {}) {
  /** @type {Record<string, unknown>} */
  const snapshot = {};
  for (const key of EXPORT_SETTING_KEYS) {
    snapshot[key] = settings[key];
  }
  const ragStyleTest =
    opts.geminiRagStyleTest ??
    (typeof localStorage !== 'undefined' &&
      localStorage.getItem(GEMINI_RAG_STYLE_TEST_STORAGE) === 'true');
  return {
    format: SETTINGS_BACKUP_FORMAT,
    schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    extensionVersion: opts.extensionVersion || '',
    settings: snapshot,
    localPrefs: {
      geminiRagStyleTest: !!ragStyleTest,
    },
  };
}

/**
 * @param {unknown} profileId
 * @returns {import('./envProfiles.js').EnvProfileId}
 */
function normalizeEnvProfileId(profileId) {
  const id = typeof profileId === 'string' ? profileId.trim() : '';
  return id in { local: 1, production: 1, custom: 1 }
    ? /** @type {import('./envProfiles.js').EnvProfileId} */ (id)
    : DEFAULT_PROFILE_ID;
}

/**
 * @param {Record<string, unknown>} raw
 * @param {{ storeBuild?: boolean }} [opts]
 * @returns {{ settings: Record<string, unknown>; localPrefs: { geminiRagStyleTest: boolean } }}
 */
export function normalizeImportedBackup(raw, opts = {}) {
  const storeBuild = opts.storeBuild ?? isStoreBuild();
  const settingsIn =
    raw && typeof raw === 'object' && raw.settings && typeof raw.settings === 'object'
      ? /** @type {Record<string, unknown>} */ (raw.settings)
      : {};

  let userLocation = settingsIn.userLocation;
  if (userLocation != null && userLocation !== '') {
    const canonical = canonicalUsState(String(userLocation));
    userLocation = canonical ?? null;
  } else {
    userLocation = null;
  }

  const locationOnboardingComplete =
    !!settingsIn.locationOnboardingComplete && hasValidUserLocation(userLocation);

  let envProfileId = normalizeEnvProfileId(settingsIn.envProfileId);
  let customApiOrigin =
    typeof settingsIn.customApiOrigin === 'string' ? settingsIn.customApiOrigin.trim() : '';
  let moderatorId =
    typeof settingsIn.moderatorId === 'string' ? settingsIn.moderatorId.trim().slice(0, 200) : '';
  let deviceId =
    typeof settingsIn.deviceId === 'string' ? settingsIn.deviceId.trim().slice(0, 200) : '';

  if (storeBuild) {
    envProfileId = 'production';
    customApiOrigin = '';
    moderatorId = '';
    deviceId = '';
  } else {
    if (envProfileId === 'custom') {
      customApiOrigin = normalizeApiOrigin(customApiOrigin) || '';
    } else {
      customApiOrigin = '';
    }
  }

  const reportEmail = normalizeReportEmail(
    typeof settingsIn.reportShareRecipientEmail === 'string'
      ? settingsIn.reportShareRecipientEmail
      : '',
  );

  if (!storeBuild) {
    if (!moderatorId) moderatorId = 'chrome-ext-dev';
    if (!deviceId) deviceId = 'chrome-ext@local';
  }

  /** @type {Record<string, unknown>} */
  const settings = {
    userLocation,
    locationOnboardingComplete,
    envProfileId,
    customApiOrigin,
    moderatorId: storeBuild ? undefined : moderatorId,
    deviceId: storeBuild ? undefined : deviceId,
    ragProvider: resolveStoredRagProviderId(
      typeof settingsIn.ragProvider === 'string' ? settingsIn.ragProvider : '',
    ),
    moderateTimeoutSec: parseModerateTimeoutSec(settingsIn.moderateTimeoutSec),
    reportEmailEnabled: !!settingsIn.reportEmailEnabled,
    reportShareRecipientEmail: reportEmail,
    reportEmailPromptComplete: !!settingsIn.reportEmailPromptComplete,
    geminiByokEnabled: !!settingsIn.geminiByokEnabled,
  };

  const localRaw =
    raw && typeof raw === 'object' && raw.localPrefs && typeof raw.localPrefs === 'object'
      ? raw.localPrefs
      : {};
  const localPrefs = {
    geminiRagStyleTest: !!(/** @type {{ geminiRagStyleTest?: boolean }} */ (localRaw).geminiRagStyleTest),
  };

  return { settings, localPrefs };
}

/**
 * @param {string} text
 * @returns {{ settings: Record<string, unknown>; localPrefs: { geminiRagStyleTest: boolean } }}
 */
export function parseSettingsImportFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text || ''));
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid settings file.');
  }
  const o = /** @type {Record<string, unknown>} */ (parsed);
  if (o.format !== SETTINGS_BACKUP_FORMAT) {
    throw new Error('Not a RAG Moderation Assistant settings file.');
  }
  const version = Number(o.schemaVersion);
  if (!Number.isFinite(version) || version !== SETTINGS_BACKUP_SCHEMA_VERSION) {
    throw new Error(`Unsupported settings file version (expected ${SETTINGS_BACKUP_SCHEMA_VERSION}).`);
  }
  if (o.settings && typeof o.settings === 'object' && 'geminiApiKey' in o.settings) {
    delete /** @type {Record<string, unknown>} */ (o.settings).geminiApiKey;
  }
  return normalizeImportedBackup(o);
}

/**
 * @param {{ settings: Record<string, unknown>; localPrefs: { geminiRagStyleTest: boolean } }} parsed
 */
export async function applySettingsImport(parsed) {
  /** @type {Record<string, unknown>} */
  const payload = {};
  const s = parsed.settings;
  if (s.userLocation !== undefined) {
    payload[STORAGE_KEYS.userLocation] = s.userLocation;
  }
  payload[STORAGE_KEYS.locationOnboardingComplete] = !!s.locationOnboardingComplete;
  payload[STORAGE_KEYS.envProfileId] = s.envProfileId ?? DEFAULT_PROFILE_ID;
  payload[STORAGE_KEYS.customApiOrigin] = s.customApiOrigin ?? '';
  if (!isStoreBuild()) {
    payload[STORAGE_KEYS.moderatorId] =
      typeof s.moderatorId === 'string' && s.moderatorId ? s.moderatorId : 'chrome-ext-dev';
    payload[STORAGE_KEYS.deviceId] =
      typeof s.deviceId === 'string' && s.deviceId ? s.deviceId : 'chrome-ext@local';
  }
  payload[STORAGE_KEYS.ragProvider] = s.ragProvider;
  payload[STORAGE_KEYS.moderateTimeoutSec] = parseModerateTimeoutSec(s.moderateTimeoutSec);
  payload[STORAGE_KEYS.reportEmailEnabled] = !!s.reportEmailEnabled;
  payload[STORAGE_KEYS.reportShareRecipientEmail] = String(s.reportShareRecipientEmail || '');
  payload[STORAGE_KEYS.reportEmailPromptComplete] = !!s.reportEmailPromptComplete;
  payload[STORAGE_KEYS.geminiByokEnabled] = !!s.geminiByokEnabled;
  payload[STORAGE_KEYS.autoNavEnabled] = true;

  await chrome.storage.local.set(payload);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(
      GEMINI_RAG_STYLE_TEST_STORAGE,
      parsed.localPrefs.geminiRagStyleTest ? 'true' : 'false',
    );
  }
  notifyExtensionUiSync();
}

/**
 * @param {{ settings: Record<string, unknown> }} parsed
 * @returns {string}
 */
export function formatImportConfirmSummary(parsed) {
  const s = parsed.settings;
  const lines = ['Import these settings?', ''];
  if (s.userLocation) lines.push(`Feed location: ${s.userLocation}`);
  lines.push(`API profile: ${s.envProfileId}`);
  if (s.envProfileId === 'custom' && s.customApiOrigin) {
    lines.push(`Custom origin: ${s.customApiOrigin}`);
  }
  lines.push(`Provider: ${s.ragProvider}`);
  lines.push(`Timeout: ${s.moderateTimeoutSec}s`);
  if (s.reportShareRecipientEmail) {
    lines.push(`Report email: ${s.reportShareRecipientEmail}`);
  }
  lines.push(`Email report button: ${s.reportEmailEnabled ? 'on' : 'off'}`);
  lines.push(`Use my Gemini key: ${s.geminiByokEnabled ? 'on' : 'off'}`);
  lines.push('', 'Your saved Gemini API key is not changed by import.');
  return lines.join('\n');
}

/**
 * @param {object} exportObject
 * @param {string} [filename]
 */
export function downloadSettingsBackup(exportObject, filename) {
  const name =
    filename ||
    `rag-moderation-settings-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([`${JSON.stringify(exportObject, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readSettingsFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
