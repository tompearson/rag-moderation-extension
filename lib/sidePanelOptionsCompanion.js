import { closeOptionsPageIfOpen } from './optionsPage.js';

/** Long-lived port from sidepanel/sidepanel.html so the service worker can detect panel teardown. */
export const SIDE_PANEL_PORT_NAME = 'rag-side-panel';

/** @returns {Promise<boolean>} */
async function noSidePanelContextOpen() {
  if (typeof chrome.runtime.getContexts !== 'function') return true;
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] });
  return contexts.length === 0;
}

export function registerCloseOptionsWhenSidePanelCloses() {
  const onClosed = chrome.sidePanel?.onClosed;
  if (onClosed?.addListener) {
    onClosed.addListener(() => {
      closeOptionsPageIfOpen().catch(() => {});
    });
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDE_PANEL_PORT_NAME) return;
    port.onDisconnect.addListener(() => {
      noSidePanelContextOpen()
        .then((closed) => {
          if (closed) closeOptionsPageIfOpen().catch(() => {});
        })
        .catch(() => {});
    });
  });
}

/** Call once when the side panel document loads. */
export function connectSidePanelLifecyclePort() {
  try {
    chrome.runtime.connect({ name: SIDE_PANEL_PORT_NAME });
  } catch {
    /* ignore */
  }
}