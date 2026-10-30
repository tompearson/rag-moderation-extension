/** @returns {Promise<boolean>} True if an options tab was closed. */
export async function closeOptionsPageIfOpen() {
  const optionsUrl = chrome.runtime.getURL('options/options.html');
  const tabs = await chrome.tabs.query({ url: optionsUrl });
  if (!tabs.length) return false;
  const ids = tabs.map((t) => t.id).filter((id) => id !== undefined);
  if (ids.length) await chrome.tabs.remove(ids);
  return true;
}

export async function toggleOptionsPage() {
  if (await closeOptionsPageIfOpen()) return;
  await chrome.runtime.openOptionsPage();
}
