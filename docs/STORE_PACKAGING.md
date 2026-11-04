# Store packaging (Chrome Web Store / Edge Add-ons)

Develop on the repo root (`Load unpacked` as today). When you are ready to QA or upload, build a **store-shaped tree** and a **ZIP** from the same output.

**Automated sideload releases:** push a semver tag (`v0.2.3`) to publish a ZIP on [GitHub Releases](https://github.com/tompearson/rag-moderation-extension/releases/latest). See [RELEASE.md](./RELEASE.md).

## Build

```bash
npm test
npm run package:store
```

Outputs:

| Artifact | Purpose |
|----------|---------|
| `dist/store/` | **Load unpacked** here for pre-upload QA (same files as the ZIP) |
| `dist/rag-moderation-assistant.zip` | Upload to [Chrome Web Store](https://chrome.google.com/webstore/devconsole) and [Edge Partner Center](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) |

Optional check that the ZIP matches the folder:

```bash
npm run verify:store-zip
```

`dist/` is gitignored; rebuild before each release.

## Local QA workflow

1. Run `npm run package:store`.
2. Chrome: `chrome://extensions` → **Load unpacked** → select **`dist/store/`** (not the repo root).
3. Edge: `edge://extensions` → same path.
4. Run the production-oriented steps in [SMOKE_TEST.md](./SMOKE_TEST.md) (no Local / Custom profile in store build).
5. After smoke passes, upload **`dist/rag-moderation-assistant.zip`** without rebuilding, or re-run verify if you changed anything.

Chrome and Edge cannot install a `.zip` directly in developer mode; the folder and ZIP are the same tree by design.

### Extension ID note

Unpacked `dist/store/` gets a **different extension ID** than a store install unless you pack with a fixed key. When production OAuth is wired ([PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)), register redirect URLs for both IDs or test auth on an unlisted store build.

## What the packager changes

- **Manifest**: [packaging/manifest.store.json](../packaging/manifest.store.json) — drops localhost / Vercel staging optional hosts; keeps production API and pick-mode host patterns.
- **Build target**: [packaging/buildConfig.store.js](../packaging/buildConfig.store.js) → `lib/buildConfig.js` in output only (`EXTENSION_TARGET = 'store'`).
- **Options UI**: hides Local / Custom profile, custom origin, and dev identity fields; locks production API.
- **Excludes**: `docs/`, `scripts/`, `README.md`, `package.json`, tests, packaging metadata (see [packaging/store-exclude.txt](../packaging/store-exclude.txt)).

Dev tree keeps [manifest.json](../manifest.json) and [lib/buildConfig.js](../lib/buildConfig.js) (`development`).

## Before public listing

See [STORE_CHECKLIST.md](./STORE_CHECKLIST.md) and [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md). Packaging can ship before auth is done; do not publish publicly until production auth smoke passes.
