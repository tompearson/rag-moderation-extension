/** @typedef {{ resolve: (token: string) => void, reject: (err: Error) => void, timer: ReturnType<typeof setTimeout>, bridgeOrigin: string }} PendingTokenRequest */

const TOKEN_TIMEOUT_MS = 20_000;

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
  bridgeFrame.src = recaptchaBridgePageUrl(normalized);
  document.body.appendChild(bridgeFrame);
}

/**
 * @param {MessageEvent} event
 */
function onBridgeMessage(event) {
  if (!pending) return;
  const expectedPage = recaptchaBridgePageUrl(pending.bridgeOrigin);
  let expectedOrigin;
  try {
    expectedOrigin = new URL(expectedPage).origin;
  } catch {
    return;
  }
  if (event.origin !== expectedOrigin) return;
  if (!event.data || typeof event.data !== 'object') return;
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
    pending = null;
    reject(new Error(String(event.data.message || 'Verification failed. Click Moderate again.')));
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', onBridgeMessage);
}

/**
 * Fresh token for each shared-pool moderation.
 * @param {string} apiOrigin
 * @param {string} [action]
 * @returns {Promise<string>}
 */
export function fetchRecaptchaTokenFromBridge(apiOrigin, action = 'moderate') {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA bridge requires a browser context'));
  }
  const normalized = bridgePostMessageOrigin(apiOrigin);
  warmupRecaptchaBridge(normalized);

  if (!bridgeFrame?.contentWindow) {
    return Promise.reject(new Error('Verification failed. Click Moderate again.'));
  }
  if (pending) {
    return Promise.reject(new Error('Verification already in progress. Wait and click Moderate again.'));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending = null;
      reject(new Error('Verification timed out. Click Moderate again.'));
    }, TOKEN_TIMEOUT_MS);

    pending = { resolve, reject, timer, bridgeOrigin: normalized };

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
