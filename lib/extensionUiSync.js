/** Side panel / other UI should refresh when settings change (Options, etc.). */
export const EXTENSION_UI_SYNC = 'EXTENSION_UI_SYNC';

/** Scroll to BYOK section, highlight key field (Options page listens). */
export const FOCUS_GEMINI_KEY_SETUP = 'FOCUS_GEMINI_KEY_SETUP';

/** Side panel shows shared-pool confirmation after Options “Continue with shared pool”. */
export const BYOK_CONTINUE_SHARED_POOL = 'BYOK_CONTINUE_SHARED_POOL';

/** Options URL hash for the Gemini key section (scroll + setup cue on load). */
export const GEMINI_BYOK_OPTIONS_HASH = 'section-gemini-byok';

/** Fire-and-forget; no listener is OK (e.g. side panel closed). */
export function notifyExtensionUiSync() {
  chrome.runtime.sendMessage({ type: EXTENSION_UI_SYNC }).catch(() => {});
}

export function notifyFocusGeminiKeySetup() {
  chrome.runtime.sendMessage({ type: FOCUS_GEMINI_KEY_SETUP }).catch(() => {});
}
