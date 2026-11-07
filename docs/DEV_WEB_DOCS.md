# Preview extension web guides locally (no deploy)

The public HTML under `https://www.airesearchdog.net/extension/...` is generated from Markdown in this repo and synced into **Moderation-Tool-Universal** `public/extension/*.html`. You can edit docs here and view the same pages on the **Vite dev server** without committing or pushing.

## Prerequisites

- Sibling checkout (default): `../community-moderation-tool/Moderation-Tool-Universal`
- Or set **`SYNC_UNIVERSAL_DIR`** to the absolute path of your Universal repo when running sync scripts.

## One command (extension repo)

From **`rag-moderation-extension`**:

```bash
npm run docs:dev
```

This runs **`npm run sync:public-guides`** (all extension guide HTML generators), then prints base URLs and the list of guide paths.

Optional: open the how-to guide in your default browser (Linux `xdg-open`, macOS `open`):

```bash
npm run docs:dev:open
```

## Start the local site (Universal)

In **Moderation-Tool-Universal** (API not required for static pages):

```bash
npm run dev
```

Vite serves **`public/`** at **`http://127.0.0.1:3000`** (see `vite.config.js`).

## URLs (production parity)

With current tooling, use the same **clean paths** as production (no `.html` in the address bar):

| Guide | Local URL |
|-------|-----------|
| Get a Gemini API key | http://127.0.0.1:3000/extension/get-gemini-api-key |
| Install in Chrome (Web Store) | http://127.0.0.1:3000/extension/install-chrome-extension |
| Install (developer / sideload) | http://127.0.0.1:3000/extension/install-chrome-extension-developer |
| Privacy | http://127.0.0.1:3000/extension/privacy |
| Terms | http://127.0.0.1:3000/extension/terms |
| Important — AI-generated analysis | http://127.0.0.1:3000/extension/important-ai-generated-analysis |
| How to moderate user posts | http://127.0.0.1:3000/extension/how-to-moderate-user-posts |
| How to test the extension | http://127.0.0.1:3000/extension/how-to-test-extension |
| Visual moderation step by step | http://127.0.0.1:3000/extension/visual-moderation-step-by-step |
| Contact | http://127.0.0.1:3000/extension/contact |

You can also load the raw files: `http://127.0.0.1:3000/extension/how-to-moderate-user-posts.html`.

Clean paths are implemented in Universal **`vite.config.js`** (dev/preview) using the same redirect table as **`vercel.json`**.

## Workflow

1. Edit `docs/*.md` (e.g. `docs/HOW_TO_MODERATE_USER_POSTS_EXTENSION.md`).
2. Run **`npm run docs:dev`** (or a single sync: `npm run sync:how-to-moderate-guide`).
3. With **`npm run dev`** running in Universal, reload the page (hard refresh if the browser cached an old HTML).

## Sync only one guide

See **`package.json`** scripts: `sync:gemini-guide`, `sync:install-chrome-guide`, `sync:install-chrome-developer-guide`, `sync:privacy-policy`, `sync:how-to-moderate-guide`, etc., or run all with **`sync:public-guides`**.

**Fast loop (developer install page):** edit `docs/INSTALL_RAG_MODERATION_EXTENSION_CHROME_DEVELOPER.md` → from extension repo `npm run sync:install-chrome-developer-guide` → reload [install-chrome-extension-developer](http://127.0.0.1:3000/extension/install-chrome-extension-developer) on Universal `npm run dev` (no `deploy:prod` until copy is final).

## What this does not start

- **`npm run dev`** in the extension repo starts RAG + Universal **API** (`scripts/dev-services.mjs`), not the Vite UI.
- For **static guide preview**, use Universal **`npm run dev`** (port **3000**). The API (`dev-server.js`, often **3001**) is unnecessary for reading these HTML pages.
