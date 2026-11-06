# RAG Moderation Assistant (browser extension)

Manifest V3 **side panel** extension for **Chrome** and **Microsoft Edge**. It calls [Moderation-Tool-Universal](https://github.com/tompearson/Moderation-Tool-Universal) `POST /api/moderate` with the **RAG provider** (`NextDoor-prompt-production-28-rag`). Universal runs Bad Words pre-screen and forwards to [first-rag-system](https://github.com/tompearson/first-rag-system) — the extension never holds `RAG_SERVICE_SECRET`.

## Features

- Side panel: **Click on Text to Moderate** / **Paste** into content, optional post context, quick/detailed analysis
- Context menu: send selected page text to the side panel
- First-run **location modal** (US state dropdown, default Oregon); `chrome.storage.local` persistence
- Environment profiles: **local**, **production**, **custom** API origin
- Results: decision, reason, breakdown, report category, RAG sources, context impact, timings
- Optional **Email report** (Options toggle); **Open full report** when the API returns a saved `moderationHistoryId`
- First-run optional **report email** dialog (skippable); editable in Options

## Load unpacked (development)

1. From this repo, start the local API stack (sibling checkouts: `first-rag-system`, `Moderation-Tool-Universal` under `~/Projects`):

   ```bash
   npm run dev          # frees :8000/:3001 if busy, then RAG + Universal API (extension)
   npm run dev:full     # same + frees :5173; starts Universal Vite UI
   ```

   Override paths if needed: `DEV_RAG_DIR=… DEV_UNIVERSAL_DIR=… npm run dev`. Manual steps: [docs/SMOKE_TEST.md](./docs/SMOKE_TEST.md).
2. Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → this directory.
3. Edge: `edge://extensions` → same steps ([docs/EDGE_PORT.md](./docs/EDGE_PORT.md)).
4. Click the toolbar icon → side panel opens.
5. Confirm location → moderate sample text.

## Options

Right-click extension icon → **Options**, or open from `chrome://extensions`.

- Environment profile and custom origin
- Grant host permission for API origin
- `moderatorId` / `deviceId` (dev defaults)
- **Platform intelligence**: V28.0.114 **RAG** (default) or **no RAG** — same provider ids as Universal
- Reset location (re-shows first-run dialog)
- Saved full report: report email; open full report always on when available

## Environment profiles

| Profile | API origin | Notes |
|---------|------------|--------|
| **Production** (default) | `https://www.airesearchdog.net` | Fresh install / factory reset |
| Local | `http://127.0.0.1:3001` | Same machine as Universal dev server |
| Custom | User-entered `https://host` | |

Host access uses `optional_host_permissions` + runtime grant before the first moderate.

Optional **bring your own Gemini key** (non-RAG provider only): [docs/BYOK_GEMINI.md](docs/BYOK_GEMINI.md).

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

## Download latest build (sideload)

**Production-shaped ZIP** from GitHub Releases (unzip → Load unpacked):

[Download latest release](https://github.com/tompearson/rag-moderation-extension/releases/latest)

Steps: [docs/RELEASE.md](./docs/RELEASE.md) and [developer install guide](https://www.airesearchdog.net/extension/install-chrome-extension-developer).

## Store / production

See [docs/STORE_CHECKLIST.md](./docs/STORE_CHECKLIST.md), [docs/STORE_PACKAGING.md](./docs/STORE_PACKAGING.md), and [docs/PROD_AUTH_SPIKE.md](./docs/PROD_AUTH_SPIKE.md) before publishing to Chrome Web Store or Edge Add-ons.

Cut a tagged release: [docs/RELEASE.md](./docs/RELEASE.md).

```bash
npm run package:store   # dist/store/ + dist/rag-moderation-assistant.zip
```

## Related repos

- **first-rag-system** — RAG HTTP API (`/moderate`)
- **Moderation-Tool-Universal** — moderation API + Bad Words + RAG client

## Preview extension web guides locally

To sync Markdown → HTML and open the same `/extension/...` pages as production on the Universal Vite dev server (no deploy), see **[docs/DEV_WEB_DOCS.md](./docs/DEV_WEB_DOCS.md)**.
