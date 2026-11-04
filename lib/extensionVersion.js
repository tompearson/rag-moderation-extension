/**
 * @returns {string | null} manifest version for UI labels and feedback payloads
 */
export function getExtensionVersion() {
  try {
    const v = chrome.runtime.getManifest().version;
    return v && String(v).trim() ? String(v).trim() : null;
  } catch {
    return null;
  }
}

/**
 * @returns {string} e.g. "v0.2.3" or empty string
 */
export function formatExtensionVersionLabel() {
  const v = getExtensionVersion();
  return v ? `v${v}` : '';
}
