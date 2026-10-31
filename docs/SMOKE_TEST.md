# Manual smoke test matrix

## Prerequisites

1. **first-rag-system** (from sibling checkout):

   ```bash
   cd /path/to/first-rag-system
   uvicorn rag_api:app --port 8000
   ```

2. **Moderation-Tool-Universal** with RAG env:

   ```bash
   cd /path/to/Moderation-Tool-Universal
   # .env.local: RAG_MODERATION_SERVICE_URL=http://127.0.0.1:8000, RAG_SERVICE_SECRET=...
   npm run dev:server
   npm run test:rag-smoke
   ```

3. **Extension** — Load unpacked from `rag-moderation-extension` root (Chrome or Edge).

## Extension tests

| # | Step | Expected |
|---|------|----------|
| 1 | First open side panel | Location modal; state picker with Oregon selected |
| 2 | Save location (pick a state) | Main UI enabled; **Feed location** picker persists after close/reopen |
| 2b | Change **Feed location** (e.g. Texas) | Saves immediately; next moderate uses new state |
| 2c | Options → Feed location state list | Scroll (wheel/trackpad) and keyboard (↑↓ Enter) work; list stays aligned if page scrolls (Chrome Win/macOS/Linux) |
| 3 | Options → Local profile | Badge shows `Local dev · http://127.0.0.1:3001` |
| 4 | Moderate benign text | `Keep` or valid decision; `moderationMode: rag`; `ragSources` array |
| 5 | Options → Reset location | Modal appears again on side panel |
| 6 | Deny host permission | Clear error when moderating |
| 7 | Production profile (when auth ready) | Moderate against `https://www.airesearchdog.net` |
| 8 | **From tab** (content) | On Nextdoor: highlight post text → side panel → **From tab** → **Allow** site access if Chrome prompts → **Content** fills |
| 8b | **From tab** (post context) | Highlight thread context → **Post context** → **From tab** fills context field |
| 8c | Empty selection + **From tab** | Status asks to select text; existing draft unchanged |
| 8d | Restricted tab (`chrome://extensions`) + **From tab** | Clear error; use Paste |
| 9 | Context menu | Select text → right-click → **Send selection to RAG Moderation** → side panel opens with **Content** filled (panel closed or already open) |
| 10 | **Pick** on Nextdoor post title | **Pick** → hover post title (`Linkify` / `link_style-provider` span) → blue outline on title only → click → **Content** has title text (e.g. “What are some good trunk or treats tonight?”) |
| 10b | **Pick** multi-paragraph | **Pick** → drag from start of post through extra paragraphs → release → **Content** includes all selected text |

## Sample content

- Keep-ish: `Block party Saturday on Oak Street — neighbors welcome!`
- Location test (Oregon feed): content mentioning another state (see RAG matrix cases).

## Automated helper (client only)

```bash
node scripts/test-unwrap.mjs
```
