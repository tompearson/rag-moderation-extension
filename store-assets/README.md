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
| `00-full-screen-no-panel-ready.png` | Moderation feed, panel closed (optional hero) |
| `01-side-panel-ready.png` | Side panel open, ready to moderate |
| `02-pick-mode.png` | Pick mode on post text |
| `03-content-ready.png` | Content captured in panel |
| `04-moderation-pending.png` | During / just before results |
| `05-moderation-results.png` | Decision + breakdown |

Captures are PNG (~**1365×768** or **1413×752**, ~1.78–1.88 aspect). Chrome asks for **1280×800** or **640×400** (1.6); upload as-is if the dashboard accepts, or export a **1280×800** crop for each file before upload.

**Listing upload:** usually **3–5** of `01`–`05` (skip `00` if you want fewer tiles). Add an **Options** shot later if the dashboard has room.

**Policy:** avoid graphic slurs in store graphics ([STORE_CHECKLIST](../docs/STORE_CHECKLIST.md)); use bland sample text if a re-capture is needed for review.

### Small promo tile (`promo/`)

| Spec | Detail |
|------|--------|
| Canvas | **440×280** |
| Format | **4-bit PNG**, no alpha (indexed palette) |
| File | `small-promo-tile-440x280.png` |

Mimics the side panel **pick** control (`button.pick-btn` in `sidepanel/sidepanel.css`): blue `#2563eb`, 8px corners, bold white label. Copy matches the side panel pick button (`sidepanel/sidepanel.html`).

Re-render after copy or color tweaks:

```bash
python scripts/render-small-promo-tile.py
```

## Icons in the CRX vs dashboard

The uploaded ZIP already ships **`icons/icon-{16,48,128}.png`** from [packaging/manifest.store.json](../packaging/manifest.store.json). Copy `icons/icon-128.png` to the listing only if the dashboard wants a separate upload; store-specific alternates can go in `icons/` here.

## Git

Commit finished assets in this folder so store listing and repo stay in sync across machines (Windows, Mint, etc.).