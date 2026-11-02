/** Side panel / other UI should refresh when settings change (Options, etc.). */
export const EXTENSION_UI_SYNC = 'EXTENSION_UI_SYNC';

/** Fire-and-forget; no listener is OK (e.g. side panel closed). */
export function notifyExtensionUiSync() {
  chrome.runtime.sendMessage({ type: EXTENSION_UI_SYNC }).catch(() => {});
}
