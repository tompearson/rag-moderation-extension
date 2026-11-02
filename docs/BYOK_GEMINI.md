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
2. **Test & save** calls Google **`generativelanguage.googleapis.com`** directly (minimal `generateContent` probe). Universal is not used for validation.
3. Optional **Also test RAG-style** runs **`embedContent`** (`gemini-embedding-001`) plus **`generateContent`** on **`gemini-2.5-flash-lite`** (fallback **`gemini-2.5-flash`**) — same Gemini usage pattern as **first-rag-system**. **429 / free-tier** on those probes means the key is accepted but quota may be exhausted for that meter; it does not call Render.
4. On success, the key is saved in **`chrome.storage.local`** only.
5. When **Use my key for moderations** is on, each moderate sends **`userApiKey`** in **`POST /api/moderate`** over HTTPS.
6. **Non-RAG** (`NextDoor-prompt-production-28`): Universal uses the key in `moderationLogic.js` for Gemini `generateContent`.
7. **RAG** (`NextDoor-prompt-production-28-rag`): Universal forwards the key to **first-rag-system** as **`geminiApiKey`** on `POST /moderate` for embed + chat (Render env key when BYOK is off).
8. Extension BYOK is **not** written to Supabase.

## What it does not do

- No sync to other devices (`chrome.storage.sync` is not used).
- No server-side storage of extension BYOK (unlike Universal web “personal key” in `moderators.gemini_key`).

## Validate-then-save flow

```text
Options → POST generativelanguage.googleapis.com/.../generateContent?key=…
  → success → chrome.storage.local
  → 4xx from Google → show error, do not save
```

Optional host permission: **`https://generativelanguage.googleapis.com/*`**.

Server **`POST /api/providers` validateGeminiKey** remains available for Universal web/admin; the extension does not use it for Test & save.

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

When BYOK is enabled and a key is saved, the side panel shows **Using your Gemini key** (no key material displayed).

## Store / privacy checklist

- [ ] Privacy policy states user may supply a Google API key; content is sent to Universal (and first-rag-system for RAG) for moderation.
- [ ] Key is user-provided, not bundled in the CRX.

## Related

- [SMOKE_TEST.md](./SMOKE_TEST.md) — BYOK rows
- [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)
- [Moderation-Tool-Universal `RAG_GEMINI_KEYS_AND_QUOTA.md`](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_GEMINI_KEYS_AND_QUOTA.md)
