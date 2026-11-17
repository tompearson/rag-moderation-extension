/** @typedef {{ resolve: (token: string) => void, reject: (err: Error) => void, timer: ReturnType<typeof setTimeout>, bridgeOrigin: string }} PendingTokenRequest */

const TOKEN_TIMEOUT_MS = 35_000;
const BRIDGE_RESET_DELAY_MS = 200;
const BRIDGE_IFRAME_LOAD_MS = 15_000;
const BRIDGE_READY_GRACE_MS = 400;

/** @type {HTMLIFrameElement | null} */
let bridgeFrame = null;
/** @type {string | null} */
let bridgeApiOrigin = null;
/** @type {PendingTokenRequest | null} */
let pending = null;

/**
 * @param {string} apiOrigin
 * @returns {string}
 */
export function recaptchaBridgePageUrl(apiOrigin) {
  const base = String(apiOrigin || '').replace(/\/$/, '');
  return `${base}/extension/recaptcha-bridge.html`;
}

/**
 * @param {string} origin
 */
function bridgePostMessageOrigin(origin) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/$/, '');
  }
}

/**
 * Drop the hidden iframe so the site bridge clears in-flight state (pending stuck, etc.).
 */
export function resetRecaptchaBridge() {
  if (pending) {
    clearTimeout(pending.timer);
    pending.reject(new Error('Verification reset. Click Moderate again.'));
    pending = null;
  }
  if (bridgeFrame?.parentNode) {
    bridgeFrame.parentNode.removeChild(bridgeFrame);
  }
  bridgeFrame = null;
  bridgeApiOrigin = null;
}

/**
 * @returns {boolean}
 */
export function isRecaptchaBridgeFetchInFlight() {
  return pending != null;
}

/**
 * Hidden iframe warmup (shared pool path only).
 * @param {string} apiOrigin
 */
export function warmupRecaptchaBridge(apiOrigin) {
  if (typeof document === 'undefined' || !apiOrigin) return;
  const normalized = bridgePostMessageOrigin(apiOrigin);
  if (bridgeFrame && bridgeApiOrigin === normalized) return;

  if (bridgeFrame?.parentNode) {
    bridgeFrame.parentNode.removeChild(bridgeFrame);
  }
  bridgeFrame = document.createElement('iframe');
  bridgeFrame.setAttribute('title', 'reCAPTCHA bridge');
  bridgeFrame.setAttribute('aria-hidden', 'true');
  bridgeFrame.tabIndex = -1;
  Object.assign(bridgeFrame.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    opacity: '0',
    pointerEvents: 'none',
    border: '0',
    left: '-9999px',
    top: '0',
  });
  bridgeApiOrigin = normalized;
  bridgeFrame.dataset.ragRecaptchaReady = '0';
  bridgeFrame.src = recaptchaBridgePageUrl(normalized);
  document.body.appendChild(bridgeFrame);
}

/**
 * @returns {Promise<void>}
 */
function waitForBridgeIframeReady() {
  if (!bridgeFrame) return Promise.resolve();
  if (bridgeFrame.dataset.ragRecaptchaReady === '1') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const deadline = setTimeout(() => resolve(), BRIDGE_IFRAME_LOAD_MS);

    const markReady = () => {
      clearTimeout(deadline);
      if (bridgeFrame) bridgeFrame.dataset.ragRecaptchaReady = '1';
      setTimeout(resolve, BRIDGE_READY_GRACE_MS);
    };

    if (bridgeFrame.contentDocument?.readyState === 'complete') {
      markReady();
      return;
    }

    bridgeFrame.addEventListener('load', () => markReady(), { once: true });
  });
}

/**
 * @param {unknown} err
 * @returns {Error}
 */
function enrichVerificationError(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/not authorized|unregistered extension id/i.test(message)) {
    return new Error(
      `${message} Open chrome://extensions and copy your extension ID, then add it via the reCAPTCHA setup guide—or use Options → BYOK.`,
    );
  }
  if (/timed out/i.test(message)) {
    return new Error(
      'Verification timed out. Check ad blockers and allow google.com, wait a few seconds after opening the panel, then click Moderate again—or use Options → BYOK.',
    );
  }
  return err instanceof Error ? err : new Error(message || 'Verification failed. Click Moderate again.');
}

/**
 * @param {MessageEvent} event
 */
function onBridgeMessage(event) {
  if (!pending) {
    if (event.data && typeof event.data === 'object' && event.data.type === 'recaptcha-bridge-ready') {
      if (bridgeFrame) bridgeFrame.dataset.ragRecaptchaReady = '1';
    }
    return;
  }
  const expectedPage = recaptchaBridgePageUrl(pending.bridgeOrigin);
  let expectedOrigin;
  try {
    expectedOrigin = new URL(expectedPage).origin;
  } catch {
    return;
  }
  if (event.origin !== expectedOrigin) return;
  if (!event.data || typeof event.data !== 'object') return;
  if (event.data.type === 'recaptcha-bridge-ready') {
    if (bridgeFrame) bridgeFrame.dataset.ragRecaptchaReady = '1';
    return;
  }
  if (event.data.type === 'recaptcha-token' && typeof event.data.token === 'string') {
    clearTimeout(pending.timer);
    const { resolve } = pending;
    pending = null;
    resolve(event.data.token);
    return;
  }
  if (event.data.type === 'recaptcha-token-error') {
    clearTimeout(pending.timer);
    const { reject } = pending;
    const message = String(event.data.message || 'Verification failed. Click Moderate again.');
    pending = null;
    const err = new Error(message);
    if (/already in progress/i.test(message)) {
      err.retryableBridgeBusy = true;
    }
    reject(err);
    resetRecaptchaBridge();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', onBridgeMessage);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} normalizedOrigin
 * @param {string} action
 * @returns {Promise<string>}
 */
async function requestRecaptchaTokenOnce(normalizedOrigin, action) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA bridge requires a browser context'));
  }
  warmupRecaptchaBridge(normalizedOrigin);
  await waitForBridgeIframeReady();

  if (!bridgeFrame?.contentWindow) {
    return Promise.reject(new Error('Verification failed. Click Moderate again.'));
  }
  if (pending) {
    return Promise.reject(new Error('Verification already in progress. Wait and click Moderate again.'));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending = null;
      resetRecaptchaBridge();
      reject(new Error('Verification timed out. Click Moderate again.'));
    }, TOKEN_TIMEOUT_MS);

    pending = { resolve, reject, timer, bridgeOrigin: normalizedOrigin };

    const target = bridgeFrame.contentWindow;
    target.postMessage(
      {
        type: 'recaptcha-token-request',
        action,
        extensionId: typeof chrome !== 'undefined' ? chrome.runtime?.id : undefined,
      },
      '*',
    );
  });
}

/**
 * Fresh token for each shared-pool moderation (retries once if the site bridge was busy or timed out).
 * @param {string} apiOrigin
 * @param {string} [action]
 * @returns {Promise<string>}
 */
export async function fetchRecaptchaTokenFromBridge(apiOrigin, action = 'moderate') {
  const normalized = bridgePostMessageOrigin(apiOrigin);

  async function attempt() {
    return requestRecaptchaTokenOnce(normalized, action);
  }

  try {
    return await attempt();
  } catch (err) {
    const retryableBusy =
      err instanceof Error &&
      (/** @type {{ retryableBridgeBusy?: boolean }} */ (err)).retryableBridgeBusy === true;
    const retryableTimeout = err instanceof Error && /timed out/i.test(err.message);

    if (retryableBusy || retryableTimeout) {
      await delay(BRIDGE_RESET_DELAY_MS);
      resetRecaptchaBridge();
      warmupRecaptchaBridge(normalized);
      try {
        return await attempt();
      } catch (retryErr) {
        throw enrichVerificationError(retryErr);
      }
    }
    throw enrichVerificationError(err);
  }
}