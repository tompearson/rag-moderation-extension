# Store readiness checklist

## Single purpose

RAG-backed community post moderation for moderators (side panel: paste content, get decision + retrieved guidelines).

## Build and local QA

- `npm run package:store` → `dist/store/` (Load unpacked) + `dist/rag-moderation-assistant.zip` (upload).
- QA the folder before upload; optional `npm run verify:store-zip`. Details: [STORE_PACKAGING.md](./STORE_PACKAGING.md).

## Package

- MV3, all logic bundled — no remote JS ([MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)).
- Icons 16 / 48 / 128 included.
- Privacy policy URL (host on airesearchdog.net or project site) describing:
  - User-provided text sent to your moderation API
  - Optional **BYOK**: user may supply a Google Gemini API key stored in `chrome.storage.local`; key sent over HTTPS for moderations; validation may call Google directly from the browser
  - No silent full-page scraping: page text only when the moderator uses **Click on Text to Moderate** or the selection context menu (with `activeTab` / user gesture)
- **Help / support URLs (optional):** static HTML on your domain (not remote code in the CRX); updates via `npm run sync:public-guides` + Universal `deploy:prod`, no new CRX required:
  - Install Chrome: [install-chrome-extension](https://www.airesearchdog.net/extension/install-chrome-extension)
  - BYOK / Gemini key: [get-gemini-api-key](https://www.airesearchdog.net/extension/get-gemini-api-key)

## Permissions justification

| Permission | Why |
|------------|-----|
| `storage` | Persist feed location, environment profile |
| `sidePanel` | Main UI |
| `activeTab` | Read **current text selection** on the tab where the moderator opened the extension |
| `scripting` | Inject a one-shot snippet when moderator clicks **Click on Text to Moderate** to read clicked block or drag-selection |
| `contextMenus` | Right-click selected text → send to side panel |
| `tabs` | Resolve active tab; open side panel from context menu |
| `clipboardRead` | Paste button reads clipboard into content field (user click) |
| Optional host origins | Moderation API (local + production); **`https://*/*`** / **`http://*/*`** granted on demand when moderator uses **Click on Text to Moderate** |

## Dual publish

- Same ZIP → [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Same ZIP → Edge Partner Center (rebrand copy — see [EDGE_PORT.md](./EDGE_PORT.md))

## Pre-submit smoke

Follow [SMOKE_TEST.md](./SMOKE_TEST.md) on **production** profile after auth spike is done.
