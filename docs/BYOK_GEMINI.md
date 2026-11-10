# Extension BYOK Gemini key

Bring your own Google Gemini API key in **Options** for **RAG and non-RAG** moderations. Once saved, **every** moderate uses your key until **Remove key**.

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
5. On success, the key is saved in **`chrome.storage.local`** only and is used for every moderation until **Remove key**.
6. Each moderate sends **`userApiKey`** in **`POST /api/moderate`** over HTTPS while a key is saved.
7. **Non-RAG** (`NextDoor-prompt-production-28`): Universal uses the key for Gemini chat.
8. **RAG** (`NextDoor-prompt-production-28-rag`): Universal forwards the key for embed + chat (shared Render key only when **no** key is saved).
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

The side panel shows **Your key · On** when a key is saved (no toggle off); **Your key · Off** only when no key is saved (shared pool). When off, the badge may show **(N/5 left)** until the install allowance is used. Badge click opens **Options** (Gemini section when a key exists).

## Shared pool allowance (no saved key)

With **Your key · Off**, the extension enforces **up to 5 successful shared-pool moderations per install** (client-side counter in `chrome.storage.local`). BYOK moderations do **not** consume this allowance. **Remove key** does **not** reset the counter. **Reset extension** (factory reset) clears settings and keys but **preserves** the shared-pool usage count. At **0** remaining, **Moderate** is blocked until you **Save key** (unlimited use of your Google quota while the key stays saved).

## Quota and returning to shared pool

While a key is saved, moderations always use it. If Google returns quota or billing errors, fix limits in **Google AI Studio** or **Remove key** in Options to use the shared pool again (subject to any remaining install allowance). The extension does **not** auto-fallback to the shared pool. After **Remove key**, Options shows **N of 5** shared moderations left (when applicable) and focuses the key field.

**Local RAG:** With **Local dev** and a **RAG** provider, run `npm run dev` from the extension repo (RAG on `:8000`, API on `:3001`).

## Store / privacy checklist

- [ ] Privacy policy states user may supply a Google API key; content is sent to Universal (and RAG service for RAG) for moderation.
- [ ] Key is user-provided, not bundled in the CRX.

## Related

- [GET_GEMINI_API_KEY_EXTENSION.md](./GET_GEMINI_API_KEY_EXTENSION.md) — source for the public guide (maintainers); **extension-only** (no Universal web BYOK steps — that UI lives in Moderation-Tool-Universal / Platform Intelligence). Published HTML folds everything before Part 1 into a collapsed **Background** block (`wrapGuideBackgroundFold` in `sync-get-gemini-guide.mjs`); extension deep links use `#google` (Part 1) or `#options` (Part 2 — Add your key, includes paste screenshot).
- **Public guides (users):** BYOK [get-gemini-api-key](https://www.airesearchdog.net/extension/get-gemini-api-key); Chrome install [install-chrome-extension](https://www.airesearchdog.net/extension/install-chrome-extension) — update via `npm run sync:public-guides` + Universal `npm run deploy:prod`
- [INSTALL_RAG_MODERATION_EXTENSION_CHROME.md](./INSTALL_RAG_MODERATION_EXTENSION_CHROME.md) — source for Chrome install guide
- [SMOKE_TEST.md](./SMOKE_TEST.md) — BYOK rows
- [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)
- [Moderation-Tool-Universal `RAG_GEMINI_KEYS_AND_QUOTA.md`](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_GEMINI_KEYS_AND_QUOTA.md)
