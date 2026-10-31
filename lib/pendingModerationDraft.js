export const PENDING_DRAFT_SESSION_KEY = 'pendingModerationDraft';

/**
 * @typedef {'content' | 'postContext'} DraftField
 * @typedef {{ content?: string; postContext?: string; field?: DraftField; capturedAt?: number }} PendingModerationDraft
 */

/**
 * @param {PendingModerationDraft} draft
 */
export async function setPendingModerationDraft(draft) {
  await chrome.storage.session.set({
    [PENDING_DRAFT_SESSION_KEY]: { ...draft, capturedAt: Date.now() },
  });
}

/** @returns {Promise<PendingModerationDraft | null>} */
export async function peekPendingModerationDraft() {
  const data = await chrome.storage.session.get(PENDING_DRAFT_SESSION_KEY);
  const draft = data[PENDING_DRAFT_SESSION_KEY];
  if (!draft || typeof draft !== 'object') return null;
  return /** @type {PendingModerationDraft} */ (draft);
}

/** @returns {Promise<PendingModerationDraft | null>} */
export async function consumePendingModerationDraft() {
  const draft = await peekPendingModerationDraft();
  if (!draft) return null;
  await chrome.storage.session.remove(PENDING_DRAFT_SESSION_KEY);
  return draft;
}
