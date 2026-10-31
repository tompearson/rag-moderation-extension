import { normalizeCapturedText } from './captureText.js';
import { setPendingModerationDraft } from './pendingModerationDraft.js';

export const CONTEXT_MENU_SEND_SELECTION = 'send-selection-to-rag-moderation';

export function registerModerationContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_SEND_SELECTION,
      title: 'Send selection to RAG Moderation',
      contexts: ['selection'],
    });
  });
}

/**
 * @param {chrome.contextMenus.OnClickData} info
 * @param {chrome.tabs.Tab | undefined} tab
 */
export async function handleModerationContextMenuClick(info, tab) {
  if (info.menuItemId !== CONTEXT_MENU_SEND_SELECTION) return;

  const text = normalizeCapturedText(info.selectionText);
  if (!text) return;

  await setPendingModerationDraft({ content: text, field: 'content' });

  if (tab?.windowId != null) {
    await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  }
}
