# Releases (GitHub — sideload builds)

Until the extension is on the Chrome Web Store, **GitHub Releases** is the primary way to hand testers a production-shaped build.

**Download latest:** [github.com/tompearson/rag-moderation-extension/releases/latest](https://github.com/tompearson/rag-moderation-extension/releases/latest)

## For maintainers — cut a release

1. Merge to `master` and confirm [CI](../.github/workflows/ci.yml) is green.
2. Create and push an annotated semver tag (manifest version is taken from the tag at build time):

   ```bash
   git tag -a v0.2.3 -m "v0.2.3"
   git push origin v0.2.3
   ```

3. Open **Actions** → **Release** workflow on that tag.
4. When it finishes, the release page has **`rag-moderation-assistant-0.2.3.zip`** attached.
5. Share the [latest releases](https://github.com/tompearson/rag-moderation-extension/releases/latest) link with testers (release notes include **SHA256**, install guide, and moderation guide links).

Tag format: `vX.Y.Z` (leading `v`; CI sets `RELEASE_VERSION` to `X.Y.Z` in the packaged `manifest.json`).

### Automatic email on release

After each tag build, the Release workflow sends mail via **Resend** to **`info@airesearchdog.net`** (ZIP link, SHA256, install guide, how-to-moderate).

**One-time setup:** GitHub repo **Settings → Secrets and variables → Actions** → add **`RESEND_API_KEY`** (same Resend key as Universal / Vercel is fine). Without it, the workflow **fails** on the email step.

Optional overrides (workflow env or change [release.yml](../.github/workflows/release.yml)):

| Variable | Default |
|----------|---------|
| `RELEASE_NOTIFY_TO` | `info@airesearchdog.net` |
| `RELEASE_NOTIFY_FROM` | `RAG Moderation Assistant <noreply@airesearchdog.net>` |

Local dry-run of copy only: `node scripts/test-release-notify-content.mjs`.

### Share with testers (email / chat)

Each GitHub Release lists:

- Direct **ZIP** link and **SHA256** of `rag-moderation-assistant-<version>.zip`
- [Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer)
- [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts)

Short copy you can paste:

```text
RAG Moderation Assistant vX.Y.Z (sideload)
ZIP: <asset URL from the release page>
SHA256: <from release notes>
Unzip → chrome://extensions → Developer mode → Load unpacked (manifest.json at folder top).
Install: https://www.airesearchdog.net/extension/install-chrome-extension-developer
How to moderate: https://www.airesearchdog.net/extension/how-to-moderate-user-posts
```

### Local verification (optional)

From **rag-moderation-extension**:

```bash
npm test
RELEASE_VERSION=0.2.3 npm run package:store
npm run verify:store-zip
npm run print:release-zip-sha256
```

Load unpacked from **`dist/store/`** for a quick check.

Compare local SHA256 to the value on the GitHub Release when testing a downloaded asset:

```bash
sha256sum rag-moderation-assistant-0.2.3.zip
```

## For testers — install from a release ZIP

Chrome and Edge **cannot** load a `.zip` directly in developer mode.

1. On [Releases](https://github.com/tompearson/rag-moderation-extension/releases/latest), download **`rag-moderation-assistant-<version>.zip`**.
2. **Unzip** to a folder. **`manifest.json`** must sit at the **top level** of that folder (not inside an extra nested directory).
3. Open `chrome://extensions` or `edge://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and select the unzipped folder.
6. Pin the toolbar icon if needed — [Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer).
7. Use the side panel — [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts).

This build defaults to the **Production** API (`https://www.airesearchdog.net`). Options hide Local dev / custom origin (store-shaped package).

### Pin the icon (toolbar)

**Pinning is not done on the extensions details page.** After Load unpacked:

1. Open **`chrome://extensions`** and confirm **RAG Moderation Assistant** is listed and **Enabled** (fix any red **Errors** first — often a wrong folder or nested unzip path).
2. Click the **extensions puzzle piece** on the Chrome toolbar → find **RAG Moderation Assistant** → click the **pin** icon so it stays on the toolbar.
3. Click the **pinned icon** to open the **side panel** (not a popup).

If the extension does not appear in the list at all, **Load unpacked** again and select the folder that contains **`manifest.json` at its top level** (not a parent of that folder). See [Install (developer)](https://www.airesearchdog.net/extension/install-chrome-extension-developer#pin-toolbar).

The side panel and Options show **`vX.Y.Z`** under the title so you can confirm which release ZIP you loaded (also shown on `chrome://extensions`).

## What the automation runs

On tag push, [.github/workflows/release.yml](../.github/workflows/release.yml):

- `npm ci` → `npm test` → `RELEASE_VERSION=<tag>` `npm run package:store` → `npm run verify:store-zip`
- SHA256 of the versioned ZIP, install guide URL, and how-to-moderate URL in release notes
- Creates a GitHub Release and uploads the versioned ZIP
- Resend email to **`info@airesearchdog.net`** with the same details (requires **`RESEND_API_KEY`** repo secret)

Every push/PR to `master` runs [.github/workflows/ci.yml](../.github/workflows/ci.yml) (tests + packaging smoke).

## Later — Chrome Web Store

The same ZIP from Releases can be uploaded to the Web Store when you are listed. See [STORE_CHECKLIST.md](./STORE_CHECKLIST.md) and [STORE_PACKAGING.md](./STORE_PACKAGING.md).

**Public HTML guides** (install, privacy, contact, etc.) update via `npm run sync:public-guides` and Universal `deploy:prod` — no extension tag required for site-only doc changes.
