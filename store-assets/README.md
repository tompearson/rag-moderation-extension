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
5. Save PNGs into `screenshots/` using the naming pattern below.

Reference shots for *workflow* (older size) live under `docs/images/how-to-moderate-walkthrough-*.png` — replace with new exports here.

## Screenshot specs (Chrome Web Store)

| Requirement | Detail |
|-------------|--------|
| Size | **1280×800** or **640×400** (16:10) |
| Format | PNG or JPEG (PNG preferred) |
| Count | At least **1**; typically **3–5** for a strong listing |

Suggested set (rename as you add files):

| Suggested filename | What to show |
|--------------------|--------------|
| `01-side-panel-ready.png` | Side panel open, empty or pasted content ready |
| `02-pick-mode.png` | Pick mode or content captured (optional) |
| `03-content-ready.png` | Content field filled before Moderate |
| `04-moderation-results.png` | Decision + breakdown after Moderate |
| `05-options-production.png` | Options: Production, feed location, legal links |

## Icons in the CRX vs dashboard

The uploaded ZIP already ships **`icons/icon-{16,48,128}.png`** from [packaging/manifest.store.json](../packaging/manifest.store.json). Copy `icons/icon-128.png` to the listing only if the dashboard wants a separate upload; store-specific alternates can go in `icons/` here.

## Git

Commit finished assets in this folder so store listing and repo stay in sync across machines (Windows, Mint, etc.).