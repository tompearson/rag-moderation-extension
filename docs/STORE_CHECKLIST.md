# Store readiness checklist

## Single purpose

RAG-backed community post moderation for moderators (side panel: paste content, get decision + retrieved guidelines).

## Package

- MV3, all logic bundled — no remote JS ([MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)).
- Icons 16 / 48 / 128 included.
- Privacy policy URL (host on airesearchdog.net or project site) describing:
  - User-provided text sent to your moderation API
  - No silent full-page scraping in v0 (optional `activeTab` only if fill-from-tab is added)

## Permissions justification

| Permission | Why |
|------------|-----|
| `storage` | Persist feed location, environment profile |
| `sidePanel` | Main UI |
| `activeTab` | Optional future: selection from active tab |
| `tabs` | Close/open Options tab from side panel toggle |
| `clipboardRead` | Paste button reads clipboard into content field (user click) |
| Optional host origins | `POST /api/moderate` to Universal (local + production) |

## Dual publish

- Same ZIP → [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Same ZIP → Edge Partner Center (rebrand copy — see [EDGE_PORT.md](./EDGE_PORT.md))

## Pre-submit smoke

Follow [SMOKE_TEST.md](./SMOKE_TEST.md) on **production** profile after auth spike is done.
