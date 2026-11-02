# Extension BYOK Gemini key (phase 1)

Bring your own Google Gemini API key in **Options** for **non-RAG** moderations only.

## Table of contents

- [What it does](#what-it-does)
- [What it does not do (phase 1)](#what-it-does-not-do-phase-1)
- [Validate-then-save flow](#validate-then-save-flow)
- [Storage and wire security](#storage-and-wire-security)
- [Side panel indicator](#side-panel-indicator)
- [Store / privacy checklist](#store--privacy-checklist)
- [Phase 2 (RAG)](#phase-2-rag)
- [Related](#related)

## What it does

1. You enter a Gemini API key in **Options → Your Gemini API key**.
2. The extension calls Universal **`POST /api/providers`** with `action: validateGeminiKey` (minimal Gemini probe).
3. On success, the key is saved in **`chrome.storage.local`** only.
4. When **Use my key for non-RAG moderations** is on and the provider is **Nextdoor V28 (no RAG)**, each moderate sends **`userApiKey`** in **`POST /api/moderate`** over HTTPS.
5. Universal uses the existing non-RAG path in `moderationLogic.js` (request-body key). The key is **not** written to Supabase in phase 1.

## What it does not do (phase 1)

- **RAG provider** (`NextDoor-prompt-production-28-rag`) still uses Render’s Gemini key — your BYOK is not sent.
- No sync to other devices (`chrome.storage.sync` is not used).
- No server-side storage of extension BYOK (unlike Universal web “personal key” in `moderators.gemini_key`).

## Validate-then-save flow

```text
Options → POST {apiOrigin}/api/providers
  body: { action: "validateGeminiKey", apiKey: "…" }
  → { valid: true } → chrome.storage.local
  → { valid: false } → show error, do not save
```

Rate limit: **10 requests / minute / IP** on validate (429 when exceeded).

## Storage and wire security

| Layer | Behavior |
|--------|----------|
| Device | Key in `chrome.storage.local`; OS profile encryption only |
| Transit | HTTPS to configured API origin; host permission required |
| Universal | Uses key for one moderation; dev-server logs redact `userApiKey` |
| Database | Phase 1: no persistence of extension BYOK |

Threat: anyone with access to your OS user profile can read extension storage. Use **Remove key** or **Reset extension** to clear.

## Side panel indicator

When BYOK is active for the current provider, the side panel shows **Using your Gemini key** (no key material displayed). Hidden for RAG provider or when BYOK is off.

## Store / privacy checklist

- [ ] Privacy policy states user may supply a Google API key; content is sent to Universal for moderation.
- [ ] Key is user-provided, not bundled in the CRX.
- [ ] Document that RAG path uses server keys until phase 2.

## Phase 2 (RAG)

Planned: forward optional Gemini key to first-rag-system on `POST /moderate` so RAG moderations can use BYOK. See Universal `RAG_GEMINI_KEYS_AND_QUOTA.md`.

## Related

- [SMOKE_TEST.md](./SMOKE_TEST.md) — BYOK rows
- [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)
- [Moderation-Tool-Universal `RAG_GEMINI_KEYS_AND_QUOTA.md`](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_GEMINI_KEYS_AND_QUOTA.md)
