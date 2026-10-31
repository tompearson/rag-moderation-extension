# Store readiness checklist

## Single purpose

RAG-backed community post moderation for moderators (side panel: paste content, get decision + retrieved guidelines).

## Package

- MV3, all logic bundled — no remote JS ([MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)).
- Icons 16 / 48 / 128 included.
- Privacy policy URL (host on airesearchdog.net or project site) describing:
  - User-provided text sent to your moderation API
  - No silent full-page scraping: page text only when the moderator uses **From tab**, **Pick on page**, or the selection context menu (with `activeTab` / user gesture)

## Permissions justification

| Permission | Why |
|------------|-----|
| `storage` | Persist feed location, environment profile |
| `sidePanel` | Main UI |
| `activeTab` | Read **current text selection** on the tab where the moderator opened the extension |
| `scripting` | Inject a one-shot snippet on user click (**From tab** / **Pick on page**) to read selection or clicked block |
| `contextMenus` | Right-click selected text → send to side panel |
| `tabs` | Resolve active tab; open side panel from context menu |
| `clipboardRead` | Paste button reads clipboard into content field (user click) |
| Optional host origins | Moderation API (local + production); **`https://*/*`** / **`http://*/*`** granted on demand when moderator uses **From tab** or **Pick** on a page |

## Dual publish

- Same ZIP → [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Same ZIP → Edge Partner Center (rebrand copy — see [EDGE_PORT.md](./EDGE_PORT.md))

## Pre-submit smoke

Follow [SMOKE_TEST.md](./SMOKE_TEST.md) on **production** profile after auth spike is done.
