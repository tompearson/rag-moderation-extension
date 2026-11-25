# Agents & maintainers — RAG Moderation Assistant

Short index for humans and coding agents working in **this repo** (`rag-moderation-extension`). Deeper detail lives in `docs/` and `.cursor/rules/` (Cursor applies those rules automatically in this workspace).

## Repo role

Chrome MV3 **side panel** extension: Nextdoor moderation UI, Options, shared-pool / BYOK Gemini, calls **Community Moderation Tool (Universal)** API. Public guides and sideload ZIP are served from **Moderation-Tool-Universal** on `airesearchdog.net`, not from extension `git push` alone.

## Sibling projects (default paths)

| Project | Typical path | Use |
|--------|--------------|-----|
| This extension | `~/Projects/rag-moderation-extension` | `npm test`, package, load unpacked |
| Universal API/UI | `../community-moderation-tool/Moderation-Tool-Universal` | `npm run dev:server`, `npm run deploy:prod` |
| RAG service | `../first-rag-system` | `uvicorn` on `:8000` |

Override with `DEV_RAG_DIR` / `DEV_UNIVERSAL_DIR`. **Local dev API:** Options → profile **Local dev** → `http://127.0.0.1:3001`. Production → `https://www.airesearchdog.net`.

## Commands (run from this repo)

```bash
npm test                    # required before release-style commits
npm run dev                 # RAG :8000 + Universal :3001 (stops prior listeners)
npm run dev:full            # adds docs/guide preview :3000
npm run docs:dev:serve      # guide preview only (:3000)
npm run package:store       # dist ZIP + latest-release.json + sync HTML into Universal public/
npm run publish:latest-sideload   # package + sync guides + Universal deploy:prod
npm run verify:store-zip
```

Load unpacked extension: Chrome/Edge → **this folder** (repo root).

## Release & Web Store

- **Overview:** [docs/EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md](docs/EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md)
- **Release steps:** [docs/RELEASE.md](docs/RELEASE.md)
- **Chrome Web Store checklist:** [docs/STORE_CHECKLIST.md](docs/STORE_CHECKLIST.md)
- **Sideload download page:** [get-latest-extension](https://www.airesearchdog.net/extension/get-latest-extension) — SHA256 must match `docs/data/latest-release.json` after `package:store` + deploy.
- **Store publisher:** [info@airesearchdog.net](mailto:info@airesearchdog.net) · **Support dashboard (Google Group):** [research-dog-publishers](https://groups.google.com/g/research-dog-publishers) — see [STORE_CHECKLIST.md](docs/STORE_CHECKLIST.md#chrome-web-store-publisher--item), [CONTACT_EXTENSION.md](docs/CONTACT_EXTENSION.md).

When packaging for users: `npm test` → `npm run package:store` → commit `docs/data/latest-release.json` with the change → deploy sideload (`npm run publish:latest-sideload` unless user asked local-only). Do **not** treat extension `git push` alone as updating the public ZIP.

## Cursor rules (in repo)

- [.cursor/rules/working-directories.mdc](.cursor/rules/working-directories.mdc) — which directory for each command
- [.cursor/rules/store-zip-sideload-docs.mdc](.cursor/rules/store-zip-sideload-docs.mdc) — ZIP → production docs pipeline

## What not to commit

- Secrets (`.env`, API keys, `*.pem`)
- `dist/`, `node_modules/` (gitignored)
- Chat transcripts or Cursor **agent stores** (machine-local under `~/.cursor/`, `~/.local/state/cursor/`)

## Code conventions

- Small, focused diffs; match existing patterns in touched files
- Side panel: `sidepanel/`; Options: `options/`; shared logic: `lib/`
- Add or extend `scripts/test-*.mjs` only when behavior is non-trivial; wire into `npm test` in `package.json`