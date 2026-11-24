# Chrome Web Store listing assets

Graphics for the **developer dashboard** only — **not** included in `dist/rag-moderation-assistant.zip` or `package:store` output.

Checklist context: [docs/STORE_CHECKLIST.md](../docs/STORE_CHECKLIST.md) (Prepare + Phase D **Store listing**).

## Folders

| Folder | Purpose |
|--------|---------|
| `screenshots/` | Listing screenshots (side panel, Moderate result, Options, etc.) |
| `icons/` | Extra store graphics if the dashboard asks beyond manifest icons (usually use repo `icons/` for 16/48/128 in the CRX) |
| `promo/` | Optional marquee / small promo tiles if you use them |

## Capture workflow

1. **From `rag-moderation-extension`:** `npm test` → `npm run package:store`.
2. Chrome → **Load unpacked** → `dist/store/` (not repo root).
3. Options → **Production** profile; pin toolbar icon.
4. Capture with a clean window; avoid real PII, slurs, or graphic reported content in frame.
5. Save into `screenshots/` (PNG or JPEG).

Older guide captures: `docs/images/how-to-moderate-walkthrough-*.png` (smaller; superseded by `screenshots/` here).

## Screenshot specs (Chrome Web Store)

| Requirement | Detail |
|-------------|--------|
| Size | **1280×800** or **640×400** (16:10) |
| Format | PNG or JPEG (PNG preferred) |
| Count | At least **1**; typically **3–5** for a strong listing |

### Current listing set (`screenshots/`)

| File | Scene |
|------|--------|
| `00-full-screen-no-panel-ready.jpg` | Moderation feed, panel closed (optional hero) |
| `01-side-panel-ready.jpg` | Side panel open, ready to moderate |
| `02-pick-mode.jpg` | Pick mode on post text |
| `03-content-ready.jpg` | Content captured in panel |
| `04-moderation-pending.jpg` | During / just before results |
| `05-moderation-results.jpg` | Decision + breakdown |

Captures are ~**1365×768** or **1413×752** JPEG (~1.78–1.88 aspect). Chrome asks for **1280×800** or **640×400** (1.6); upload as-is if the dashboard accepts, or export a **1280×800** crop for each file before upload.

**Listing upload:** usually **3–5** of `01`–`05` (skip `00` if you want fewer tiles). Add an **Options** shot later if the dashboard has room.

**Policy:** avoid graphic slurs in store graphics ([STORE_CHECKLIST](../docs/STORE_CHECKLIST.md)); use bland sample text if a re-capture is needed for review.

## Icons in the CRX vs dashboard

The uploaded ZIP already ships **`icons/icon-{16,48,128}.png`** from [packaging/manifest.store.json](../packaging/manifest.store.json). Copy `icons/icon-128.png` to the listing only if the dashboard wants a separate upload; store-specific alternates can go in `icons/` here.

## Git

Commit finished assets in this folder so store listing and repo stay in sync across machines (Windows, Mint, etc.).