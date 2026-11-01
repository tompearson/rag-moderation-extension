# Production auth spike (extension)

**Status:** Documented patterns — implement before Chrome Web Store / Edge Add-ons public listing.

## Constraints

- Do **not** embed `RAG_SERVICE_SECRET` or Gemini keys in the extension package (extractable from CRX). That secret is only between Universal and first-rag-system ([RAG_SERVICE_SECRET_SYNC.md](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_SERVICE_SECRET_SYNC.md) in the Universal repo).
- RAG remains server-to-server: Universal → first-rag-system `POST /moderate`.
- Extension calls **Universal only**: `POST {apiOrigin}/api/moderate` with `provider: NextDoor-prompt-production-28-rag`.

## Current v0 (sideload)

- Placeholder `moderatorId` / `deviceId` in Options (defaults `chrome-ext-dev`, `chrome-ext@local`).
- Production Vercel handler may require valid moderator UUIDs and enforce revocation (HTTP 423).

## Recommended patterns (pick one before store)

### 1. Reuse Universal moderator identity (preferred)

- Extension opens the existing web app sign-in (OAuth / magic link / device registration) via `chrome.identity.launchWebAuthFlow` or a dedicated tab.
- Store short-lived session token or moderator UUID in `chrome.storage.local` / `chrome.storage.session`.
- Send real `moderatorId` + `deviceId` on `/api/moderate`.

### 2. Extension BFF route (Universal repo)

- Add `POST /api/extension/moderate` (or similar):
  - Validates extension client id + user bearer token.
  - Calls existing `runModerationAndSave` / RAG branch internally.
  - Rate-limited; no shared secret in the client.

### 3. User-pasted token (private sideload only)

- Options field for API token — **not** acceptable for public store listings.

## Production CORS vs host permissions

- Chromium extensions with **`host_permissions`** (or granted optional origins) call the API from the service worker without relying on web CORS.
- Vercel [`api/moderate.js`](https://github.com/tompearson/Moderation-Tool-Universal) reflects `Access-Control-Allow-Origin` for web clients; extension path should use granted origins.

## Checklist before store submission

- [ ] Real moderator auth flow wired
- [ ] Smoke `production` profile against `https://www.airesearchdog.net/api/moderate`
- [ ] Privacy policy describes text sent to API
- [ ] No secrets in shipped ZIP
