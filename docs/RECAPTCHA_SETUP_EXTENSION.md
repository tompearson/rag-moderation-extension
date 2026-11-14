# reCAPTCHA (extension maintainer notes)

Secrets and Google Cloud setup live in **Moderation-Tool-Universal**, not in this repo. The authoritative owner checklist is:

**`../../community-moderation-tool/Moderation-Tool-Universal/docs/guides/RECAPTCHA_SETUP.md`** (relative to this `docs/` folder)

(on your machine: `~/Projects/community-moderation-tool/Moderation-Tool-Universal/docs/guides/RECAPTCHA_SETUP.md`)

## On this page {#toc}

- [What the extension does](#what-the-extension-does)
- [Bridge deploy checklist](#bridge-deploy)
- [After Universal / Vercel key changes](#after-universal-vercel)
- [Local stack](#local-stack)
- [Docs you may edit here](#docs-you-may-edit)
- [Optional later (rollout)](#optional-later)

---

## What the extension does {#what-the-extension-does}

- Shared-pool **`/api/moderate`** (no user Gemini key) loads a token from your hosted **bridge page**, then sends `recaptchaToken` with the moderation request.
- BYOK moderators (user API key in Options) skip extension-side captcha; server may still skip verify when a forwarded key is present.
- The extension never stores `RECAPTCHA_SECRET_KEY` or `RECAPTCHA_ENTERPRISE_API_KEY`.

## Bridge deploy checklist (shared-pool Moderate) {#bridge-deploy}

| Step | Where | Who |
|------|--------|-----|
| 1. Copy extension ID | Chrome → `chrome://extensions` → **RAG Moderation Assistant** → **ID** | You (must match allowlist) |
| 2. Allowlist IDs | `lib/recaptcha-bridge-extension-ids.json` and/or `RECAPTCHA_BRIDGE_EXTENSION_IDS` in Universal `.env.local` | Repo |
| 3. Sync bridge | **From `rag-moderation-extension`:** `npm run sync:recaptcha-bridge` | Agent / you |
| 4. Vercel env | `RECAPTCHA_MODE_MODERATE=log` (+ optional `RECAPTCHA_BRIDGE_EXTENSION_IDS`) | Vercel dashboard or `scripts/set-vercel-recaptcha-env.sh` |
| 5. Ship HTML | **From `Moderation-Tool-Universal`:** `npm run deploy:prod` | Agent / you |
| 6. Sanity URL | View source: `https://www.airesearchdog.net/extension/recaptcha-bridge.html` — real site key, non-empty `ALLOWED_EXTENSION_IDS`, `enterprise.js` when Enterprise env is set | Browser |

Unpacked IDs depend on the **folder you load** (hash of absolute path). Common paths on this machine:

- `…/rag-moderation-extension` → `afbocecefdmhofeahodpcpeebbmbjlnf`
- `…/rag-moderation-extension/dist/store` → `jagdbbhecefdgkpjinahcojiilcgempg`

If Moderate still times out, your ID is different — paste it into `lib/recaptcha-bridge-extension-ids.json`, re-sync, redeploy.

## After Universal / Vercel key changes {#after-universal-vercel}

**From `rag-moderation-extension`:**

```bash
npm run sync:recaptcha-bridge
# or full public guide sync:
npm run sync:public-guides
```

Then commit synced `public/extension/recaptcha-bridge.html` in Universal (via sync) and redeploy production from Universal (`npm run deploy:prod`).

Set `RECAPTCHA_BRIDGE_EXTENSION_IDS` on Vercel to comma-separated extension IDs (store + any unpacked test IDs).

## Local stack {#local-stack}

**From `rag-moderation-extension`:** `npm run dev` — API at `http://127.0.0.1:3001`. Universal `.env.local` must match production key names (see main guide).

## Docs you may edit here {#docs-you-may-edit}

| File | Purpose |
|------|---------|
| `docs/static/recaptcha-bridge.html` | Bridge source (site key placeholder filled at sync) |
| `docs/PRIVACY_POLICY_EXTENSION.md` | reCAPTCHA disclosure for Chrome Web Store |

For `gcloud`, Vercel env, CreateAssessment, and production log strings, use the Universal guide (sections B–F). Full phased table: section G there.

## Optional later (rollout) {#optional-later}

**Now (prod verified):** `RECAPTCHA_MODE_DISCUSS=log` and `RECAPTCHA_MODE_MODERATE=log` — scores in Vercel logs; **no blocking**.

| When | Action |
|------|--------|
| Next | `RECAPTCHA_MODE_RERUN=log` — confirm `[recaptcha] rerun: ok score=…` on report rerun |
| Tune | Review scores; adjust `RECAPTCHA_MIN_SCORE` (default `0.5`) before any enforce |
| Enforce (order matters) | `RECAPTCHA_MODE_DISCUSS=enforce` → then **rerun** → **moderate last** |
| Store / new unpacked ID | Add ID → `lib/recaptcha-bridge-extension-ids.json` → `npm run sync:recaptcha-bridge` → `npm run deploy:prod` |
| Fail-open | Keep `RECAPTCHA_FAIL_OPEN=true` unless you accept blocking all public AI when Google verify is down |

Do not skip **log** mode on a surface until Vercel shows healthy `ok score=` lines for that route (incognito / shared pool as appropriate).