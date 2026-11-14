# Vendored from Moderation-Tool-Universal

Files below are **copies** of Universal repo sources. They do **not** auto-update when Universal deploys. After changing the Universal source, run the sync command and commit.

| Extension path | Universal source | Sync command | If stale |
|----------------|------------------|--------------|----------|
| `lib/linkify.js` | `utils/linkify.js` | `npm run sync:linkify` | Side panel shows raw `[text](url)` while reports show links |
| `lib/sanitizeModerationText.js` | `utils/sanitizeModerationText.js` | `npm run sync:linkify` | Prose/JSON cleanup differs from report for the same moderation id |
| `public/extension/*.html` (in Universal checkout) | Markdown in this repo `docs/` | `npm run sync:public-guides` | Wrong public help pages |
| `public/extension/recaptcha-bridge.html` | `docs/static/recaptcha-bridge.html` | `npm run sync:recaptcha-bridge` | Extension shared-pool moderate can't get a token |

reCAPTCHA owner setup (GCP, `gcloud`, Vercel): Universal `docs/guides/RECAPTCHA_SETUP.md`; extension summary: [RECAPTCHA_SETUP_EXTENSION.md](./RECAPTCHA_SETUP_EXTENSION.md).

Override Universal path: `SYNC_UNIVERSAL_DIR=/path/to/Moderation-Tool-Universal npm run sync:linkify`

See also [README.md](../README.md) and the extension breakdown linkify plan (maintainer triggers).
