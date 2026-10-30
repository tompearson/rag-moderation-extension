# RAG Moderation Assistant (browser extension)

Manifest V3 **side panel** extension for **Chrome** and **Microsoft Edge**. It calls [Moderation-Tool-Universal](https://github.com/tompearson/Moderation-Tool-Universal) `POST /api/moderate` with the **RAG provider** (`NextDoor-prompt-production-28-rag`). Universal runs Bad Words pre-screen and forwards to [first-rag-system](https://github.com/tompearson/first-rag-system) — the extension never holds `RAG_SERVICE_SECRET`.

## Features

- Side panel: paste content, optional post context, quick/detailed analysis
- First-run **location modal** (US state dropdown, default Oregon); `chrome.storage.local` persistence
- Environment profiles: **local**, **production**, **custom** API origin
- Results: decision, reason, breakdown, report category, RAG sources, context impact, timings

## Load unpacked (development)

1. Start RAG + Universal (see [docs/SMOKE_TEST.md](./docs/SMOKE_TEST.md)).
2. Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → this directory.
3. Edge: `edge://extensions` → same steps ([docs/EDGE_PORT.md](./docs/EDGE_PORT.md)).
4. Click the toolbar icon → side panel opens.
5. Confirm location → moderate sample text.

## Options

Right-click extension icon → **Options**, or open from `chrome://extensions`.

- Environment profile and custom origin
- Grant host permission for API origin
- `moderatorId` / `deviceId` (dev defaults)
- Reset location (re-shows first-run dialog)

## Environment profiles

| Profile | API origin | Notes |
|---------|------------|--------|
| **Production** (default) | `https://www.airesearchdog.net` | Fresh install / factory reset |
| Local | `http://127.0.0.1:3001` | Same machine as Universal dev server |
| Custom | User-entered `https://host` | |

Host access uses `optional_host_permissions` + runtime grant before the first moderate.

## Project layout

```
manifest.json
background/service-worker.js   # fetch /api/moderate
sidepanel/                     # UI + location modal
options/
lib/                           # envProfiles, userSettings, usStates, moderateClient, …
docs/                          # store, Edge, smoke, prod auth spike
```

## Tests

```bash
node scripts/test-unwrap.mjs
```

Full stack: Universal `npm run test:rag-smoke` then manual matrix in [docs/SMOKE_TEST.md](./docs/SMOKE_TEST.md).

## Store / production

See [docs/STORE_CHECKLIST.md](./docs/STORE_CHECKLIST.md) and [docs/PROD_AUTH_SPIKE.md](./docs/PROD_AUTH_SPIKE.md) before publishing to Chrome Web Store or Edge Add-ons.

## Related repos

- **first-rag-system** — RAG HTTP API (`/moderate`)
- **Moderation-Tool-Universal** — moderation API + Bad Words + RAG client
