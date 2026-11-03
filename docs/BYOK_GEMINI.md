# Extension BYOK Gemini key

Bring your own Google Gemini API key in **Options** for **RAG and non-RAG** moderations when **Use my key for moderations** is on.

## Table of contents

- [What it does](#what-it-does)
- [What it does not do](#what-it-does-not-do)
- [Validate-then-save flow](#validate-then-save-flow)
- [Storage and wire security](#storage-and-wire-security)
- [Side panel indicator](#side-panel-indicator)
- [Store / privacy checklist](#store--privacy-checklist)
- [Related](#related)

## What it does

1. You enter a Gemini API key in **Options → Your Gemini API key**.
2. **Save key** checks your key with Google directly (`generativelanguage.googleapis.com`). Universal is not used for validation.
3. When a **RAG provider** is selected, validation also checks **RAG search + AI** (embed + flash-lite chat). **Advanced → Also check RAG search + AI** adds the same when using a non-RAG provider. **429 / free-tier** on those probes means the key is accepted but quota may be exhausted; Render is not called.
4. You see a short **summary** (and optional **Details**); same readiness labels as the web app (`ready`, `ready_with_limits`, etc.).
5. On success, the key is saved in **`chrome.storage.local`** only. You can **Turn on** moderations with your key or leave it off until later.
6. When **Use my key for moderations** is on, each moderate sends **`userApiKey`** in **`POST /api/moderate`** over HTTPS.
7. **Non-RAG** (`NextDoor-prompt-production-28`): Universal uses the key for Gemini chat.
8. **RAG** (`NextDoor-prompt-production-28-rag`): Universal forwards the key for embed + chat (shared Render key when BYOK is off).
9. Extension BYOK is **not** written to Supabase.

## What it does not do

- No sync to other devices (`chrome.storage.sync` is not used).
- No server-side storage of extension BYOK (unlike Universal web “personal key” on your moderator record).

## Validate-then-save flow

```text
Options → POST generativelanguage.googleapis.com (chat probe; optional RAG probes)
  → success → chrome.storage.local
  → invalid key from Google → show summary, do not save
```

Optional host permission: **`https://generativelanguage.googleapis.com/*`**.

Universal **`POST /api/providers` validateGeminiKey** is used by the web app; the extension validates in the browser.

## Storage and wire security

| Layer | Behavior |
|--------|----------|
| Device | Key in `chrome.storage.local`; OS profile encryption only |
| Transit | HTTPS to configured API origin; host permission required |
| Universal | Uses key for one moderation; logs redact `userApiKey` |
| first-rag-system | Optional `geminiApiKey` per request; never logged |
| Database | No persistence of extension BYOK |

Threat: anyone with access to your OS user profile can read extension storage. Use **Remove key** or **Reset extension** to clear.

## Side panel indicator

The side panel always shows a **Your key · On/Off** control (no key material). Click to turn your saved key on or off; if no key is saved, click opens **Options** with a short status message.

## Store / privacy checklist

- [ ] Privacy policy states user may supply a Google API key; content is sent to Universal (and RAG service for RAG) for moderation.
- [ ] Key is user-provided, not bundled in the CRX.

## Related

- [GET_GEMINI_API_KEY_EXTENSION.md](./GET_GEMINI_API_KEY_EXTENSION.md) — source for the public guide (maintainers); **extension-only** (no Universal web BYOK steps — that UI lives in Moderation-Tool-Universal / Platform Intelligence)
- **Public guides (users):** BYOK [get-gemini-api-key](https://www.airesearchdog.net/extension/get-gemini-api-key); Chrome install [install-chrome-extension](https://www.airesearchdog.net/extension/install-chrome-extension) — update via `npm run sync:public-guides` + Universal `npm run deploy:prod`
- [INSTALL_RAG_MODERATION_EXTENSION_CHROME.md](./INSTALL_RAG_MODERATION_EXTENSION_CHROME.md) — source for Chrome install guide
- [SMOKE_TEST.md](./SMOKE_TEST.md) — BYOK rows
- [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)
- [Moderation-Tool-Universal `RAG_GEMINI_KEYS_AND_QUOTA.md`](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_GEMINI_KEYS_AND_QUOTA.md)
