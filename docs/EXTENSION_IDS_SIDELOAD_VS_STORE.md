# Extension IDs — sideload vs Chrome Web Store

Chrome assigns every installed extension an **extension ID**: 32 lowercase letters (for example `kjfknniomfjfiajamckpiohcgdpeedba`). That ID appears in `chrome://extensions`, in OAuth redirect URLs, and in the **reCAPTCHA bridge allowlist** for shared-pool **Moderate**.

This doc explains why **sideload testers** often need per-machine setup while **store users** do not, and what to do as we move toward a **Chrome Web Store** listing.

**Related:** [RECAPTCHA_SETUP_EXTENSION.md](./RECAPTCHA_SETUP_EXTENSION.md) · [STORE_CHECKLIST.md](./STORE_CHECKLIST.md) · [STORE_PACKAGING.md](./STORE_PACKAGING.md)

## On this page {#toc}

- [At a glance](#at-a-glance)
- [How Chrome picks the ID](#how-chrome-picks-the-id)
- [Shared-pool Moderate and reCAPTCHA](#shared-pool-moderate-and-recaptcha)
- [Sideload (ZIP / Load unpacked)](#sideload)
- [Chrome Web Store (planned)](#chrome-web-store)
- [BYOK (no allowlist)](#byok)
- [Store launch checklist (IDs + reCAPTCHA)](#store-launch-checklist)
- [Optional: stable ID for sideload (`manifest` key)](#optional-stable-sideload-id)
- [OAuth and other services](#oauth)

---

## At a glance {#at-a-glance}

| Install path | Who | Extension ID | Shared-pool reCAPTCHA |
|--------------|-----|--------------|------------------------|
| **Chrome / Edge Web Store** (future public install) | All store users | **One ID** for the published listing — same for everyone on that store | Add **that store ID once** to `lib/recaptcha-bridge-extension-ids.json` → sync + deploy — **no per-user IDs** |
| **Sideload** — unzip + **Load unpacked** | Testers, devs | **Often different** per computer and per folder path | Each distinct unpacked ID must be on the allowlist **or** the tester uses **BYOK** |
| **Dev** — Load unpacked on **repo root** | Maintainers | Another ID (path-based) | Same as sideload — allowlist or BYOK |

Same **ZIP contents** as the store build (`npm run package:store`); only **how Chrome installs it** changes whether the ID is shared (store) or per-path (unpacked).

---

## How Chrome picks the ID {#how-chrome-picks-the-id}

- **Web Store install:** Google signs the CRX. Every user who installs from **your listing** gets the **same** extension ID (the one shown on the developer dashboard for that item).
- **Load unpacked (developer mode):** Chrome derives an ID from the extension’s **public key**. With **no** `key` field in `manifest.json`, that key comes from the **absolute path** of the folder you select. Different machine, drive letter, unzip location, or folder (repo root vs `dist/store/`) → **different ID**.
- We do **not** ship a fixed `key` in the repo today, so sideload IDs are expected to vary until we optionally add one for testers (see [Optional: stable sideload ID](#optional-stable-sideload-id)).

Copy the ID: `chrome://extensions` → **Developer mode** → **RAG Moderation Assistant** → **ID**.

---

## Shared-pool Moderate and reCAPTCHA {#shared-pool-moderate-and-recaptcha}

When the moderator uses the **shared API pool** (no Gemini key in Options), **Moderate** loads a reCAPTCHA token from:

`https://www.airesearchdog.net/extension/recaptcha-bridge.html`

That page only talks to extension origins whose IDs are in **`ALLOWED_EXTENSION_IDS`** (built from `lib/recaptcha-bridge-extension-ids.json` at sync time). If the installed ID is missing:

- The side panel shows **“not authorized for reCAPTCHA (unregistered extension ID)”**, or
- (older behavior) the request may **time out** waiting for a token.

Allowlist changes are **server-side only** — `npm run sync:recaptcha-bridge` and Universal `npm run deploy:prod`. Testers **do not** need a new ZIP for a new ID.

---

## Sideload (ZIP / Load unpacked) {#sideload}

**Audience:** release testers, QA, maintainers validating the store-shaped build before upload.

| Fact | Implication |
|------|-------------|
| Each tester’s ID depends on **where** they unzipped and which folder they **Load unpacked** | We **cannot** pre-allow “all sideload users” without a fixed `key` or store install |
| Maintainer/dev machines are a **small, known set** | IDs are added to `lib/recaptcha-bridge-extension-ids.json` as needed |
| Public sideload download is **temporary** | Accept manual allowlist for testers; document **BYOK** as the workaround when Moderate fails with “unregistered extension ID” |

**Workflow for a new tester machine**

1. Install from [get-latest-extension](https://www.airesearchdog.net/extension/get-latest-extension) (see [INSTALL_RAG_MODERATION_EXTENSION_CHROME_DEVELOPER.md](./INSTALL_RAG_MODERATION_EXTENSION_CHROME_DEVELOPER.md)).
2. Copy ID from `chrome://extensions`.
3. Maintainer: add ID → **from `rag-moderation-extension`:** `npm run sync:recaptcha-bridge` → **from `Moderation-Tool-Universal`:** `npm run deploy:prod`.
4. Tester: reload extension, try **Moderate** again.

**Or:** **Options → BYOK** (Gemini API key) — moderation does **not** use the reCAPTCHA bridge; extension ID does not matter.

Example IDs on known maintainer paths (for debugging only — **your** path may differ):

| Load path | Example ID |
|-----------|------------|
| `…/rag-moderation-extension` (repo root) | `afbocecefdmhofeahodpcpeebbmbjlnf` |
| `…/rag-moderation-extension/dist/store` | `jagdbbhecefdgkpjinahcojiilcgempg` |
| Separate Windows box (sideload ZIP) | `kjfknniomfjfiajamckpiohcgdpeedba` |
| i7-games (sideload ZIP) | `eamajlnamlngfooejbjjadgcfpeehnin` |
| Chromite (unpacked sideload) | `efbpgaeohniogdfhpbdnfciijinbaajf` |

Canonical list in git: `lib/recaptcha-bridge-extension-ids.json`.

---

## Chrome Web Store (planned) {#chrome-web-store}

**Audience:** moderators who install from the official listing (see [STORE_CHECKLIST.md](./STORE_CHECKLIST.md)).

| Fact | Implication |
|------|-------------|
| One listing → **one extension ID** for all users | After first store upload (even **unlisted**), copy the dashboard ID |
| Same ZIP as sideload (`dist/rag-moderation-assistant.zip`) | Packaging does **not** change the store ID; Google assigns it at publish time |
| Scale | **Add the store ID once** to the reCAPTCHA allowlist — every store install works for shared-pool **Moderate** without per-user registration |

**After Chrome Web Store accepts the package**

1. Chrome Web Store Developer Dashboard → **RAG Moderation Assistant** → note **ID**.
2. Add that ID to `lib/recaptcha-bridge-extension-ids.json` (keep existing sideload/dev IDs until you retire sideload).
3. `npm run sync:recaptcha-bridge` → commit synced bridge in Universal if you track it → `npm run deploy:prod`.
4. Smoke: fresh **store** install (not unpacked), shared pool, **Moderate** on production.

Store ID and unpacked `dist/store/` ID are **different** unless you use a fixed packing key (unusual for store submissions). Plan OAuth and any other ID-bound config for **both** during the transition ([STORE_PACKAGING.md § Extension ID](./STORE_PACKAGING.md#extension-id-note), [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md)).

---

## BYOK (no allowlist) {#byok}

If the user saves a **Gemini API key** in Options ([GET_GEMINI_API_KEY_EXTENSION.md](./GET_GEMINI_API_KEY_EXTENSION.md)):

- Moderation uses their key; the extension **does not** call the reCAPTCHA bridge for that path.
- **Extension ID does not matter** for BYOK moderations.

Use BYOK for sideload testers when you do not want to maintain their allowlist entry.

---

## Store launch checklist (IDs + reCAPTCHA) {#store-launch-checklist}

Use with [STORE_CHECKLIST.md](./STORE_CHECKLIST.md).

- [ ] Upload `dist/rag-moderation-assistant.zip`; obtain **store extension ID** from the dashboard (unlisted test install is fine).
- [ ] Add store ID to `lib/recaptcha-bridge-extension-ids.json`.
- [ ] `npm run sync:recaptcha-bridge` → `npm run deploy:prod`.
- [ ] Verify [recaptcha-bridge.html](https://www.airesearchdog.net/extension/recaptcha-bridge.html) source includes store ID in `ALLOWED_EXTENSION_IDS`.
- [ ] Production smoke: **store-installed** extension, no BYOK, **Moderate** succeeds.
- [ ] Document public install URL on [install-chrome-extension](https://www.airesearchdog.net/extension/install-chrome-extension); steer normal moderators **away** from sideload unless they are testers.
- [ ] (Later) Trim sideload-only IDs from the allowlist if you fully retire public ZIP testing.

---

## Optional: stable sideload ID (`manifest` key) {#optional-stable-sideload-id}

Chrome allows a **`key`** field in `manifest.json` so unpacked installs from a given pack always get the **same** ID (useful for a **single** canonical tester path). Tradeoffs:

- **Pros:** Fewer one-off allowlist entries for testers who all use the same released folder layout.
- **Cons:** Must guard the private key material; store build may use Google’s signing instead; dev repo-root loads may still differ if they do not use the keyed manifest.

Not implemented today. Default remains: **store = one ID**, **sideload = allowlist or BYOK**.

---

## OAuth and other services {#oauth}

Any feature that registers **chrome-extension://<ID>/...** redirect URLs (production auth, future integrations) must list:

- The **store ID** (all end users), and  
- Any **unpacked IDs** you still use for QA,

or restrict those tests to store/unlisted builds. See [PROD_AUTH_SPIKE.md](./PROD_AUTH_SPIKE.md).