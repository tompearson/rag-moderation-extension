# Manual smoke test matrix

## Table of contents

- [Prerequisites](#prerequisites)
- [Extension tests](#extension-tests)
- [BYOK Gemini (optional)](#byok-gemini-optional)
- [Sample content](#sample-content)
- [Automated helper (client only)](#automated-helper-client-only)

## Prerequisites

1. **first-rag-system** (from sibling checkout):

   ```bash
   cd /path/to/first-rag-system
   uvicorn rag_api:app --port 8000
   ```

2. **Moderation-Tool-Universal** with RAG env:

   ```bash
   cd /path/to/Moderation-Tool-Universal
   # .env.local: RAG_MODERATION_SERVICE_URL=http://127.0.0.1:8000
   # RAG_SERVICE_SECRET must match first-rag-system/.env (see RAG_SERVICE_SECRET_SYNC.md in Universal)
   npm run dev:server
   npm run test:rag-smoke
   ```

   Secret sync (local, Vercel, Render): [Moderation-Tool-Universal `docs/guides/RAG_SERVICE_SECRET_SYNC.md`](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_SERVICE_SECRET_SYNC.md)

3. **Extension** — Load unpacked from `rag-moderation-extension` root (Chrome or Edge).

## Extension tests

| # | Step | Expected |
|---|------|----------|
| 1 | First open side panel | Location modal; state picker with Oregon selected |
| 1b | After saving location | Optional **Report email** modal; **Not now** / **×** / **Escape** continues without email |
| 1c | Report email modal → Save valid email | Address persisted; modal does not reappear on reopen |
| 2 | Save location (pick a state) | Main UI enabled; **Feed location** picker persists after close/reopen |
| 2b | Change **Feed location** (e.g. Texas) | Saves immediately; next moderate uses new state |
| 2c | Options → Feed location state list | Scroll (wheel/trackpad) and keyboard (↑↓ Enter) work; list stays aligned if page scrolls (Chrome Win/macOS/Linux) |
| 3 | Options → Local profile | Badge shows `Local dev · http://127.0.0.1:3001` |
| 4 | Moderate benign text | `Keep` or valid decision; `moderationMode: rag`; `ragSources` array |
| 5 | Options → Reset location | Modal appears again on side panel |
| 6 | Deny host permission | Clear error when moderating |
| 7 | Production profile | Moderate against `https://www.airesearchdog.net`; RAG provider should **not** return 401 (503 quota is a separate Gemini issue — [RAG_GEMINI_KEYS_AND_QUOTA.md](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_GEMINI_KEYS_AND_QUOTA.md)) |
| 7b | Production RAG curl (no extension) | `curl -sS -X POST 'https://www.airesearchdog.net/api/moderate' …` with `NextDoor-prompt-production-28-rag` — see [RAG_SERVICE_SECRET_SYNC § Verify](https://github.com/tompearson/Moderation-Tool-Universal/blob/master/docs/guides/RAG_SERVICE_SECRET_SYNC.md#verify) |
| 8 | **Click on Text to Moderate** | Nextdoor post detail → button (pulses) → **Allow** site access if prompted → grays (**Click text on the page…**) → click comment or drag-select → **Content** replaces with capture only; **no new tab** for in-post links |
| 8b | Single comment | On long thread, click inside one comment → **Content** has that comment only (not whole thread / profile links) |
| 9 | Context menu | Select text → right-click → **Send selection to RAG Moderation** → side panel opens with **Content** filled (panel closed or already open) |
| 10 | Multi-paragraph | Drag from start of post through extra paragraphs → release → **Content** includes selected text |
| 11 | Options → enable **Open full report**, moderate (prod + DB save) | **Open full report** on results opens production view URL |
| 12 | Options → report email + enable **Email report** | **Email report** sends via API; status confirms |
| 12b | Saved report → **Review this Decision** → note → **Send it** | Success status; **Feedback** chip on Moderation Reports / Admin Query Submit Feedback (same `submitFeedback` as full report) |
| 13 | Report toggles off (email/open) | **Review this Decision** still shown when `moderationHistoryId` present; email/open hidden |
| 14 | Factory reset | Location + optional report email dialogs again |

## BYOK Gemini (optional)

See [BYOK_GEMINI.md](./BYOK_GEMINI.md). Requires Universal with `POST /api/providers` validate (same deploy as production API).

| # | Step | Expected |
|---|------|----------|
| B1 | Options → invalid key → **Test & save** | Error from server; nothing saved in storage |
| B2 | Options → valid key → **Test & save** | Success; “Key saved”; input cleared; checkbox on |
| B3 | Provider **no RAG**, BYOK on → side panel | Badge **Using your Gemini key** |
| B4 | Switch provider to **RAG**, BYOK still on | Badge hidden; RAG hint visible in Options |
| B5 | Moderate (no RAG + BYOK) | Uses your quota (not Render pool); no `userApiKey` sent when RAG selected |
| B6 | **Remove key** or factory reset | Badge hidden; moderate without BYOK |

## Sample content

- Keep-ish: `Block party Saturday on Oak Street — neighbors welcome!`
- Location test (Oregon feed): content mentioning another state (see RAG matrix cases).

## Automated helper (client only)

```bash
node scripts/test-unwrap.mjs
node scripts/test-report-view-url.mjs
```
