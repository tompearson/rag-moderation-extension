const FEEDBACK_SESSION_STORAGE_KEY = 'feedbackSessionId';

/** @returns {Promise<string>} */
export async function getOrCreateFeedbackSessionId() {
  const stored = await chrome.storage.session.get(FEEDBACK_SESSION_STORAGE_KEY);
  const existing = stored[FEEDBACK_SESSION_STORAGE_KEY];
  if (typeof existing === 'string' && existing.trim()) {
    return existing.trim();
  }
  const sessionId = crypto.randomUUID();
  await chrome.storage.session.set({ [FEEDBACK_SESSION_STORAGE_KEY]: sessionId });
  return sessionId;
}
