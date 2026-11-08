import { isStoreBuild } from './buildConfig.js';
import { resolveApiConfig, formatApiProfileUiLabel } from './envProfiles.js';
import {
  hasSavedGeminiKey,
  isByokConfigured,
  formatGeminiKeySuffixLabel,
} from './geminiByok.js';
import { isFeedLocationConfirmed } from './userSettings.js';
import { resolveStoredRagProviderId, RAG_PROVIDER_OPTIONS } from './ragProviders.js';

const GEMINI_RAG_STYLE_TEST_STORAGE = 'geminiRagStyleTest';

/**
 * @param {string} id
 * @returns {string}
 */
function ragProviderLabel(id) {
  const resolved = resolveStoredRagProviderId(id);
  const hit = RAG_PROVIDER_OPTIONS.find((o) => o.id === resolved);
  if (hit) return hit.label;
  return resolved ? `Custom (${resolved})` : '—';
}

/**
 * Human-readable Gemini / quota line for support (never includes the API key).
 * @param {Awaited<ReturnType<import('./userSettings.js').loadSettings>>} settings
 * @returns {{ saved: string; moderationQuota: string }}
 */
export function describeGeminiKeyForContact(settings) {
  const saved = hasSavedGeminiKey(settings);
  const suffix = saved ? formatGeminiKeySuffixLabel(settings.geminiApiKey) : '';
  const savedLine = saved
    ? `Yes${suffix ? ` (ends with ${suffix})` : ''}`
    : 'No';
  const moderationQuota = isByokConfigured(settings)
    ? `Your Gemini key (BYOK on)${suffix ? ` ${suffix}` : ''}`
    : saved
      ? 'Shared pool (BYOK off; key saved but not used)'
      : 'Shared pool (no personal key saved)';
  return { saved: savedLine, moderationQuota };
}

/**
 * @typedef {object} ExtensionContactOptionsContext
 * @property {string} [analysisType] — side panel only
 * @property {boolean} [badWordsEnabled] — side panel only
 * @property {boolean} [geminiRagStyleTest] — Options advanced checkbox (defaults from localStorage in browser)
 */

/**
 * Build sanitized Options snapshot rows for POST /api/extension-contact (no API key value).
 * @param {Awaited<ReturnType<import('./userSettings.js').loadSettings>>} settings
 * @param {ExtensionContactOptionsContext} [context]
 * @returns {Array<{ label: string; value: string }>}
 */
export function buildExtensionContactOptionsSnapshot(settings, context = {}) {
  const api = resolveApiConfig(settings.envProfileId, settings.customApiOrigin);
  const gemini = describeGeminiKeyForContact(settings);
  const ragStyleTest =
    context.geminiRagStyleTest ??
    (typeof localStorage !== 'undefined' &&
    localStorage.getItem(GEMINI_RAG_STYLE_TEST_STORAGE) === 'true');

  /** @type {Array<{ label: string; value: string }>} */
  const rows = [
    { label: 'Extension package', value: isStoreBuild() ? 'Store / sideload (Production locked)' : 'Developer unpack' },
    {
      label: 'API profile',
      value: api.apiOrigin
        ? `${formatApiProfileUiLabel(api)} (${api.apiOrigin})`
        : formatApiProfileUiLabel(api),
    },
    { label: 'Platform intelligence', value: ragProviderLabel(settings.ragProvider) },
    { label: 'Moderation timeout', value: `${settings.moderateTimeoutSec} s` },
    {
      label: 'Feed location',
      value: isFeedLocationConfirmed(settings)
        ? String(settings.userLocation || '—')
        : settings.userLocation
          ? `${settings.userLocation} (onboarding incomplete)`
          : 'Not set',
    },
    { label: 'Email report enabled', value: settings.reportEmailEnabled ? 'Yes' : 'No' },
    {
      label: 'Report email',
      value: settings.reportShareRecipientEmail?.trim() || '(not set)',
    },
    { label: 'Personal Gemini key saved', value: gemini.saved },
    { label: 'Gemini quota for moderation', value: gemini.moderationQuota },
    { label: 'Use my key (BYOK toggle)', value: settings.geminiByokEnabled ? 'On' : 'Off' },
    {
      label: 'Extra RAG check on Save key',
      value: ragStyleTest ? 'On' : 'Off',
    },
  ];

  if (!isStoreBuild()) {
    rows.push(
      { label: 'moderatorId', value: settings.moderatorId || '(default)' },
      { label: 'deviceId', value: settings.deviceId || '(default)' },
    );
  }

  if (context.analysisType) {
    rows.push({ label: 'Side panel analysis', value: context.analysisType });
  }
  if (context.badWordsEnabled !== undefined) {
    rows.push({
      label: 'Bad Words pre-screen',
      value: context.badWordsEnabled ? 'On' : 'Off',
    });
  }

  return rows;
}
