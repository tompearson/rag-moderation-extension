# Store readiness checklist

**Maintainer map (ZIPs, releases, on-site download):** [EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md](./EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md)

## Table of contents

- [Program policies pre-review (read first)](#program-policies-pre-review-read-first)
- [Prepare your extension (official guide)](#prepare-your-extension-official-guide)
- [Publish your extension (official guide)](#publish-your-extension-official-guide)
- [Chrome Web Store publisher & item](#chrome-web-store-publisher--item)
- [Chrome Web Store dashboard (click path)](#chrome-web-store-dashboard-click-path)
- [Single purpose](#single-purpose)
- [Build and local QA](#build-and-local-qa)
- [Package](#package)
- [Permissions justification](#permissions-justification)
- [Dual publish](#dual-publish)
- [Extension ID and reCAPTCHA (shared pool)](#extension-id-and-recaptcha-shared-pool)
- [Pre-submit smoke](#pre-submit-smoke)

Official reference: [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies) · [Publish](https://developer.chrome.com/docs/webstore/publish) · [Privacy practices tab](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) · [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements) · [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare)

---

## Chrome Web Store publisher & item {#chrome-web-store-publisher--item}

Maintainer reference (not shipped in the CRX).

| | |
|---|---|
| **Publisher ID** | `bb82e6dd-78ee-44d3-8bcf-c04973e46d5c` |
| **Publisher account (Chrome)** | [info@airesearchdog.net](mailto:info@airesearchdog.net) — Google account on the developer registration / dashboard |
| **Developer dashboard** | [devconsole](https://chrome.google.com/webstore/devconsole/bb82e6dd-78ee-44d3-8bcf-c04973e46d5c) |
| **RAG Moderation Assistant (listing)** | Extension ID `bbonemfjjakfkiogdhnplmbdbggbkjmc` · [edit item](https://chrome.google.com/webstore/devconsole/bb82e6dd-78ee-44d3-8bcf-c04973e46d5c/bbonemfjjakfkiogdhnplmbdbggbkjmc/edit) |
| **Support dashboard (Google Group)** | [research-dog-publishers](https://groups.google.com/g/research-dog-publishers) — our group hub for extension support, announcements, and publisher coordination (optional in **Store listing**; day-to-day install help: [extension/contact](https://www.airesearchdog.net/extension/contact) / **help@**) |

**Publisher ID** = developer account segment in the devconsole URL (not the extension ID). **Extension ID** = per listing install ID from `chrome://extensions`; add it to `lib/recaptcha-bridge-extension-ids.json` before shared-pool **Moderate** from the store build ([Phase E](#phase-e--after-first-upload-maintainer-not-in-dashboard)).

---

## Program policies pre-review (read first) {#program-policies-pre-review-read-first}

Google reviews against the full **[Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)** (plus the developer agreement). Work through this **before** filling the dashboard or uploading the ZIP. Each row points at a policy block on that page; nested docs cover details (e.g. [MV3](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements), [single purpose FAQ](https://developer.chrome.com/docs/webstore/program-policies#single-purpose)).

### Account and listing honesty

| Policy topic | Our situation | Pre-submit check |
|--------------|---------------|------------------|
| [Best practices §5–7](https://developer.chrome.com/docs/webstore/program-policies/policies#best-practices-and-guidelines) — accurate metadata, test before submit, valid contact | Maintainer docs + [SMOKE_TEST.md](./SMOKE_TEST.md) | [ ] Store listing matches real behavior; [ ] **2-Step Verification** on publisher Google account ([technical §2SV](https://developer.chrome.com/docs/webstore/program-policies/policies#2-step-verification)); [ ] `help@` / `admin@` inboxes monitored |
| [Impersonation](https://developer.chrome.com/docs/webstore/program-policies/policies#impersonation--intellectual-property) | Third-party moderation aid; not “official Nextdoor/Google” | [ ] Name, icon, description do **not** imply endorsement by Nextdoor, Google, or any platform |
| [Misleading or unexpected behavior](https://developer.chrome.com/docs/webstore/program-policies/policies#misleading-or-unexpected-behavior) | AI suggestions, not human decisions | [ ] Listing + screenshots state **AI-assisted** moderation; link [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) in support copy |
| [Deceptive installation tactics](https://developer.chrome.com/docs/webstore/program-policies/policies#deceptive-installation-tactics) | Normal store install only for public users | [ ] Marketing/site does not bundle unrelated offers or hide that an **extension** is being installed |

### Privacy and data (highest review scrutiny for this product)

| Policy topic | Our situation | Pre-submit check |
|--------------|---------------|------------------|
| [Privacy policy](https://developer.chrome.com/docs/webstore/program-policies/policies#privacy-policy) | Hosted [extension/privacy](https://www.airesearchdog.net/extension/privacy) | [ ] Policy date current; [ ] Dashboard **Privacy policy URL** matches; [ ] Describes BYOK, shared pool, reCAPTCHA, airesearchdog API, optional email actions |
| [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/policies#limited-use) | No ads, no data brokerage; moderation + service operation only | [ ] Privacy **practices** checkboxes match [PRIVACY_POLICY_EXTENSION.md](./PRIVACY_POLICY_EXTENSION.md); [ ] Certify **no** selling/transfers for ads or unrelated purposes |
| Limited Use — **web browsing activity** | Page text only on **user gesture** (pick, selection, paste); no background history feed | [ ] **Store listing** and [privacy § Access to web pages](./PRIVACY_POLICY_EXTENSION.md#access-to-web-pages) prominently say capture is **moderator-initiated**; [ ] Dashboard single-purpose text matches |
| [Limited Use — Google APIs](https://developer.chrome.com/docs/webstore/program-policies/policies#limited-use) (item 6) | BYOK calls Gemini; shared pool may use Google server-side / reCAPTCHA | [ ] Confirm live [privacy](https://www.airesearchdog.net/extension/privacy) includes **Limited Use** after deploy (see [PRIVACY_POLICY_EXTENSION.md](./PRIVACY_POLICY_EXTENSION.md) § Google reCAPTCHA) |
| [Use of permissions](https://developer.chrome.com/docs/webstore/program-policies/policies#use-of-permissions) | `optional_host_permissions` for `http(s)://*/*` is broad | [ ] Justify every manifest permission in dashboard; [ ] Be ready to explain **optional** wide hosts = on-demand pick/capture + user-granted API host only ([permissions table](#permissions-justification)) |
| [Disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#disclosure-requirements) | Chrome install dialog lists permissions | [ ] First-run / Options make clear what is sent when user clicks **Moderate** |
| [Handling requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#handling-requirements) | HTTPS to API and Google | [ ] No secrets in extension package; BYOK stays in `chrome.storage.local` |

### Safety and prohibited use (usually N/A — confirm)

| Policy topic | Our situation | Pre-submit check |
|--------------|---------------|------------------|
| [Malicious and prohibited products](https://developer.chrome.com/docs/webstore/program-policies/policies#malicious-and-prohibited-products) | No malware, crypto mining, paywall bypass | [ ] Extension does **not** automate login evasion or scrape behind auth without moderator already on the page |
| [Hate speech / mature content](https://developer.chrome.com/docs/webstore/program-policies/policies#hate-speech-and-violent-behavior) | Panel may **display** reported posts moderators submit | [ ] Listing/screenshots do not **promote** hate or violence; [ ] Do not use graphic slurs in store graphics; tool is for **professional moderation**, not distribution of harmful content |
| [Spam §3–4](https://developer.chrome.com/docs/webstore/program-policies/policies#spam-and-abuse) | Email invite, contact, report email | [ ] **Invite** / **Contact** / **Email report** send only after explicit user action; no spam notifications (extension does not abuse notification permission) |

### Quality and MV3 technical

| Policy topic | Our situation | Pre-submit check |
|--------------|---------------|------------------|
| [Quality — single purpose](https://developer.chrome.com/docs/webstore/program-policies/policies#quality-guidelines) | One job: moderator side panel + capture helpers | [ ] No unrelated bundles (shopping, news, unrelated toolbars); [Nextdoor content script](packaging/manifest.store.json) tied to moderation queue UX only |
| [Minimum functionality](https://developer.chrome.com/docs/webstore/program-policies/policies#minimum-functionality) | Core path: capture → Moderate → decision | [ ] [SMOKE_TEST.md](./SMOKE_TEST.md) on store build; production API + (after listing) store ID on reCAPTCHA allowlist |
| [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#listing-requirements) | Privacy fields must match behavior | [ ] No keyword stuffing; [ ] Dashboard data-use declarations **match** privacy policy (mismatch = removal risk) |
| [MV3 additional requirements](https://developer.chrome.com/docs/webstore/program-policies/policies#additional-requirements-for-manifest-v3) | Bundled JS; API + reCAPTCHA bridge iframe | [ ] **Remote code = No** in dashboard; [ ] No `eval` of remote strings; bridge page is **data/token**, logic in package ([RECAPTCHA_SETUP_EXTENSION.md](./RECAPTCHA_SETUP_EXTENSION.md)) |
| [Code readability](https://developer.chrome.com/docs/webstore/program-policies/policies#code-readability-requirements) | Minified/bundled only, not obfuscated | [ ] Store ZIP from `package:store`; no packed secrets |

### Monetization (confirm negatives)

| Policy topic | Our situation | Pre-submit check |
|--------------|---------------|------------------|
| [Ads](https://developer.chrome.com/docs/webstore/program-policies/policies#ads) / [Affiliate](https://developer.chrome.com/docs/webstore/program-policies/policies#affiliate-ads) | None in extension | [ ] No injected ads or affiliate cookies |
| [Accepting payment](https://developer.chrome.com/docs/webstore/program-policies/policies#accepting-payment-from-users) | Free extension; user may pay Google for own Gemini usage | [ ] Listing states extension is **free**; BYOK charges are **user ↔ Google**, described in privacy |

### Suggested reading order (≈30–45 min)

1. Full index: [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies) — skim section headers.  
2. **Protecting User Privacy** — all subsections (your main review time).  
3. **Building Quality Products** — Quality Guidelines, Listing Requirements, Minimum Functionality.  
4. **Technical Requirements** — MV3 + Code Readability.  
5. [Prepare](https://developer.chrome.com/docs/webstore/prepare) · [Publish](https://developer.chrome.com/docs/webstore/publish) — pre-upload and first-submit flow (mapped below).

Then continue to [Prepare your extension](#prepare-your-extension-official-guide), [Publish your extension](#publish-your-extension-official-guide), and [Chrome Web Store dashboard (click path)](#chrome-web-store-dashboard-click-path).

#### Limited Use disclosure {#limited-use-disclosure-gap}

Policy requires a **public** Limited Use statement when the product uses Google-related user data (e.g. Gemini BYOK validation, reCAPTCHA). **Done** in [PRIVACY_POLICY_EXTENSION.md](./PRIVACY_POLICY_EXTENSION.md) after **Google reCAPTCHA** — sync with `npm run sync:privacy-policy` (or `npm run sync:public-guides`) and `deploy:prod` before store submission.

---

## Prepare your extension (official guide) {#prepare-your-extension-official-guide}

Google’s short pre-upload checklist: [Prepare your extension before submitting](https://developer.chrome.com/docs/webstore/prepare). How **RAG Moderation Assistant** maps to it.

| [Prepare](https://developer.chrome.com/docs/webstore/prepare) step | Requirement | Our repo / status |
|------|-------------|-------------------|
| **Test in production** | Feature-complete build tested before upload | **From `rag-moderation-extension`:** `npm run package:store` → Load unpacked **`dist/store/`** (not repo root) → [SMOKE_TEST.md](./SMOKE_TEST.md). Store build locks **Production** API ([STORE_PACKAGING.md](./STORE_PACKAGING.md)). |
| **Review manifest** | `name`, `version`, `icons`, `description` (≤132 chars); dashboard **cannot** edit these after upload — fix source, bump version, new ZIP | Edit [`packaging/manifest.store.json`](../packaging/manifest.store.json); packager writes `dist/store/manifest.json`. Current description is **67 / 132** chars. Typos post-upload require **Upload new package** with higher `version`. |
| **Version numbering** | Each upload must be **greater** than the previous; Google often suggests a low first version (e.g. `0.0.0.1`) | We use semver (`0.2.12` today). Fine for first store item; only **increase** on every re-upload. Override at package time: `RELEASE_VERSION=X.Y.Z npm run package:store`. |
| **Valid manifest JSON** | No comments; parse errors block upload | Store manifest is strict JSON (no `//` comments). “Cannot parse manifest” → validate `packaging/manifest.store.json`. |
| **Zip layout** | `manifest.json` at **root** of archive, not inside a subfolder | `dist/rag-moderation-assistant.zip` from `npm run package:store`; optional `npm run verify:store-zip`. |
| **Listing content** | Long description, screenshots, promo images beyond manifest | Fill **Store listing** in dashboard ([Phase D](#phase-d--left-sidebar-tabs-fill-in-order)). Asset tips: [Create a great listing page](https://developer.chrome.com/docs/webstore/best-listing). Host help URLs on airesearchdog.net (already synced). **Screenshots** — capture from store build (side panel, Moderate result, Options); not shipped in the ZIP. |

### Pre-upload checklist (Prepare doc only)

- [ ] `npm test` → `npm run package:store` → `npm run verify:store-zip` (optional).
- [ ] Smoke **`dist/store/`** on Production ([SMOKE_TEST.md](./SMOKE_TEST.md)).
- [ ] Manifest fields final: `name`, `version`, `description` ≤132, icons 16/48/128 present in output.
- [ ] Program policies + privacy aligned ([pre-review](#program-policies-pre-review-read-first)).
- [ ] Listing screenshots and long description drafted (dashboard, not manifest). PNGs: [store-assets/](../store-assets/README.md) (`screenshots/`, 1280×800 or 640×400).
- [ ] Upload `dist/rag-moderation-assistant.zip` → then [Publish flow](#publish-your-extension-official-guide) and [dashboard phases](#chrome-web-store-dashboard-click-path).

---

## Publish your extension (official guide) {#publish-your-extension-official-guide}

First-time submit walkthrough: [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish). Use with [Prepare](#prepare-your-extension-official-guide) and the [dashboard click path](#chrome-web-store-dashboard-click-path) below.

| [Publish](https://developer.chrome.com/docs/webstore/publish) section | What Google says | Our mapping |
|--------|------------------|-------------|
| **Upload** | Dashboard → **Add new item** → ZIP ≤2GB; valid manifest to edit listing | [Phase C](#phase-c--new-item--upload): `dist/rag-moderation-assistant.zip` |
| **Item limits** | **New publishers:** up to **two published extensions** (limit shown in dashboard). Request increase if at cap; themes exempt | Before first **public** publish, check dashboard limit. RAG Moderation Assistant is likely your **first** listing — OK. Second extension later (e.g. Edge-only fork is still one Chrome item) counts toward the cap. |
| **Sidebar tabs** | **Package** (read-only at first) · **Store listing** · **Privacy** (single purpose + data) · **Distribution** · **Test instructions** (optional) | [Phase D](#phase-d--left-sidebar-tabs-fill-in-order). UI may say **Privacy practices** — same tab; detail: [cws-dashboard-privacy](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy). |
| **Submit for review** | Fix errors, then **Submit for review** | [Phase F](#phase-f--submit-for-review) |
| **Deferred publish** | Uncheck auto-publish to release manually after approval; or **Defer publish** from item menu later | Prefer defer for first item until [SMOKE_TEST.md](./SMOKE_TEST.md) on store install + reCAPTCHA allowlist ([Phase E](#phase-e--after-first-upload-maintainer-not-in-dashboard)) |
| **30-day publish window** | After review completes, you have **up to 30 days** to publish; then staged submission reverts to **draft** (must re-submit for review) | Watch **staged item status** in dashboard; publish before expiry |
| **Cancel review** | If you find a bug after submit, **cancel review** → upload fixed ZIP → submit again | Bump `version` in `packaging/manifest.store.json`, `package:store`, re-upload **Package** |
| **Review process** | Timing varies by item; takedown/rejection emails on by default | [Understanding the review process](https://developer.chrome.com/docs/webstore/review-process) |
| **Account notifications** | Optional email when item is **published** or **staged** | Developer dashboard **Account** page → enable publish/staged notifications (takedown emails default on) |
| **Updates** | Later versions: new ZIP via dashboard update flow | [Phase G](#phase-g--after-approval); [Update your Chrome Web Store item](https://developer.chrome.com/docs/webstore/update) |

### Publish checklist (from official doc)

- [ ] Prepare + policies done ([Prepare](#prepare-your-extension-official-guide), [pre-review](#program-policies-pre-review-read-first)).
- [ ] Publisher **extension limit** OK (or increase requested).
- [ ] All sidebar tabs saved; Package shows expected version.
- [ ] **Submit for review** with chosen auto-publish vs defer.
- [ ] After approval: publish within **30 days** (if deferred); run smoke + allowlist store ID.
- [ ] Account email settings: can receive rejection/takedown; optional staged/published alerts.

---

## Chrome Web Store dashboard (click path) {#chrome-web-store-dashboard-click-path}

Use this **after** `npm test` and `npm run package:store`, with [local QA on `dist/store/`](./STORE_PACKAGING.md#local-qa-workflow) done. Upload **`dist/rag-moderation-assistant.zip`** only — `manifest.json` at the **root** of the ZIP (no `dist/store/` wrapper folder inside the archive).

### Phase A — Before you open the dashboard

- [ ] Complete [Program policies pre-review](#program-policies-pre-review-read-first) (especially privacy, Limited Use, permissions, MV3).
- [ ] **From `rag-moderation-extension`:** `npm test` → `npm run package:store` (optional `npm run verify:store-zip`).
- [ ] Bump **`version`** in `packaging/manifest.store.json` before each new upload (Chrome requires a higher version than the last published package).
- [ ] Confirm production guides are live: [privacy](https://www.airesearchdog.net/extension/privacy), [terms](https://www.airesearchdog.net/extension/terms), [contact](https://www.airesearchdog.net/extension/contact).
- [ ] Have **screenshots** (1280×800 or 640×400) and a **128×128** store icon ready if the listing wizard asks beyond manifest icons.

### Phase B — Developer account (one time)

1. Open **[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)** (or [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)).
2. Sign in with the Google account that will **own** the listing.
3. If prompted, **pay the one-time developer registration fee** and accept developer terms.
4. *(Optional, account-level)* Under developer account settings, ensure your **privacy policy** URL for the publisher matches [extension/privacy](https://www.airesearchdog.net/extension/privacy) if the dashboard asks at account level.
5. Check **published extension limit** for new publishers ([publish § Item limits](https://developer.chrome.com/docs/webstore/publish#item-limits)) — default **2**; request increase if needed.
6. **Account** page: enable email when item is **published** or **staged** if you want those alerts ([publish § review process](https://developer.chrome.com/docs/webstore/publish#the-review-process)).

### Phase C — New item + upload

1. On the dashboard home, click **New item** / **Add new item** (wording may vary).
2. **Choose file** → select **`dist/rag-moderation-assistant.zip`** → **Upload**.
3. If upload fails:
   - **No manifest found in package** — upload **`dist/rag-moderation-assistant.zip`** only (not a hand-zipped `store` folder, not repo root). On Windows, re-run `npm run package:store` so the ZIP uses a root `manifest.json` entry ([STORE_PACKAGING.md](./STORE_PACKAGING.md#zip-tooling-windows-vs-linux)).
   - **Cannot parse manifest** — usually invalid JSON; store manifest has no comments ([prepare guide](https://developer.chrome.com/docs/webstore/prepare)).
   - **ZIP too large** — must be under 2GB (not an issue for this extension).
4. When validation passes, the item appears in your list — open it. The left sidebar shows tabs below.

### Phase D — Left sidebar tabs (fill in order) {#phase-d--left-sidebar-tabs-fill-in-order}

Work through each section. **Save** as you go. Tab names match [Google’s publish doc](https://developer.chrome.com/docs/webstore/publish); minor UI renames are possible.

#### Package

- [ ] Confirms uploaded ZIP, version, and MV3 package. **Not editable** for manifest fields here — fix in repo, bump version, re-`package:store`, upload a **new** package on this tab or via **Upload new package**.

#### Store listing

- [ ] **Description** — what moderators do: side panel, paste/capture post text, AI-assisted decision + guideline citations (align with [single purpose](#single-purpose)).
- [ ] **Category** — e.g. *Productivity* or *Developer Tools* (pick the best fit; consistency matters more than perfection).
- [ ] **Language** — English (add others later if needed).
- [ ] **Graphic assets** — screenshots of side panel + Options; use manifest icons where the form allows.
- [ ] **Official URL / homepage** (if offered) — `https://www.airesearchdog.net/extension/guides` or moderation docs home.
- [ ] **Support / contact** — `https://www.airesearchdog.net/extension/contact` or `help@airesearchdog.net`; publisher account **info@airesearchdog.net**; support hub: [research-dog-publishers](https://groups.google.com/g/research-dog-publishers).

Manifest already ships **name**, **short description** (≤132 chars), and **icons** — listing copy can expand, but should not contradict the manifest.

#### Privacy / Privacy practices

Google’s [publish](https://developer.chrome.com/docs/webstore/publish) doc calls this the **Privacy** tab; the form is documented as [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

- [ ] **Single purpose** — paste the [detailed statement](#single-purpose-dashboard) into the Privacy practices field (trim if the form enforces a character cap).

- [ ] **Permission justifications** — for each permission Chrome lists, paste from the [table below](#permissions-justification) (edit wording to fit each field’s size).
- [ ] **Remote code** — select **No, I am not using remote code** for the store build (logic is bundled; API calls are network requests, not executed remote script — [MV3 policy](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)).
- [ ] **Data use** — disclose, at minimum:
  - Moderation **content the user provides** (pasted or captured text) sent to `https://www.airesearchdog.net` (shared pool) or Google Gemini when **BYOK** is enabled.
  - **Optional API key** stored locally in `chrome.storage.local` when the user enables BYOK.
  - No sale of user data; limited use consistent with [privacy policy](https://www.airesearchdog.net/extension/privacy).
- [ ] **Privacy policy URL** — `https://www.airesearchdog.net/extension/privacy`

#### Distribution

- [ ] **Visibility** — for first validation, prefer **Unlisted** or **Private / limited testers** so only people with the link can install while you run [SMOKE_TEST.md](./SMOKE_TEST.md) on a **real store install**.
- [ ] **Regions** — default worldwide, or restrict if you have a reason.
- [ ] **Pricing** — free (not a paid item).

#### Test instructions (optional but helpful for review)

- [ ] Short steps: install → pin toolbar icon → open side panel on a community feed → Options show **Production** only → run **Moderate** on sample text.
- [ ] If reviewers need shared-pool access without BYOK, note that reCAPTCHA runs via your domain (no reviewer login required for basic Moderate smoke).
- [ ] Do **not** put secrets in this field; use BYOK instructions only if you supply a **dedicated test key** you are willing to rotate.

### Phase E — After first upload (maintainer, not in dashboard)

Do this before relying on shared-pool **Moderate** from the store build:

1. Install the **unlisted** listing on a test profile (same as end users will).
2. Open `chrome://extensions` → copy **Extension ID** (32 characters).
3. Add that ID to `lib/recaptcha-bridge-extension-ids.json`.
4. **From `rag-moderation-extension`:** `npm run sync:recaptcha-bridge` → **From `Moderation-Tool-Universal`:** `npm run deploy:prod`.
5. Re-test **Moderate** without BYOK.

Details: [EXTENSION_IDS_SIDELOAD_VS_STORE.md](./EXTENSION_IDS_SIDELOAD_VS_STORE.md).

### Phase F — Submit for review

1. Resolve any **errors** or **warnings** on the item (red/yellow indicators in the sidebar).
2. Click **Submit for review** (top or item toolbar).
3. In the confirmation dialog:
   - [ ] **Publish timing** — consider **unchecking** “publish automatically after review” so you can **manually publish** after you read approval email (or use **Defer publish** from the item menu later — [publish § Deferred publishing](https://developer.chrome.com/docs/webstore/publish#deferred-publishing-option)).
4. Wait for review (days to weeks). See [Understanding the review process](https://developer.chrome.com/docs/webstore/review-process).
5. **Cancel review** if you must ship a fixed ZIP before review ends — then bump version, `package:store`, re-upload, submit again ([publish § Deferred publishing](https://developer.chrome.com/docs/webstore/publish#deferred-publishing-option)).

### Phase G — After approval

- [ ] Publish within **30 days** if deferred ([publish](https://developer.chrome.com/docs/webstore/publish): staged submission otherwise reverts to draft).
- [ ] Complete [Phase E](#phase-e--after-first-upload-maintainer-not-in-dashboard) (store ID + reCAPTCHA) before public shared-pool Moderate.
- [ ] Run production [SMOKE_TEST.md](./SMOKE_TEST.md) on the **store-installed** extension.
- [ ] Update public install copy if the live store URL differs from placeholders in [INSTALL_RAG_MODERATION_EXTENSION_CHROME.md](./INSTALL_RAG_MODERATION_EXTENSION_CHROME.md) (sync guides + `deploy:prod` when the listing URL is final).
- [ ] Future updates: bump `packaging/manifest.store.json` version → `npm run package:store` → dashboard → **Package** → **Upload new package** → fill changelog if asked → **Submit for review** ([Update your item](https://developer.chrome.com/docs/webstore/update)).

---

## Single purpose

RAG-backed community post moderation for moderators (side panel: paste content, get decision + retrieved guidelines).

### Single purpose (dashboard) {#single-purpose-dashboard}

Paste into **Privacy practices → Single purpose** (detailed primary functionality):

```text
RAG Moderation Assistant has one purpose: to help volunteer and staff community moderators decide whether reported user-generated content should stay on a platform or be removed, using AI-assisted analysis grounded in retrieved community-guideline excerpts.

Primary functionality (all in the side panel):
• The moderator supplies the text under review by pasting, clicking Paste, right-clicking a page selection, or using pick mode to capture only the text they click or drag-select—never automatic whole-page scraping.
• They optionally add post context, set feed location and analysis options in Options, then click Moderate.
• The extension sends only that user-chosen content (and related moderation settings) to the Community Moderation Tool API on https://www.airesearchdog.net, or to Google Gemini when the moderator enables bring-your-own-key (BYOK). The API returns a suggested outcome (keep, remove, or maybe), explanation, and citations from retrieved policy material.
• Optional Nextdoor-oriented helpers (e.g. queue awareness, navigation to a moderation feed) exist only to reach the same moderation workflow faster; they do not change the single purpose.

The extension does not serve ads, sell data, provide unrelated browsing tools, or perform background surveillance. It does not run remote code; logic is bundled in the package. Every network transfer of content is initiated by the moderator’s explicit action to moderate specific text they chose to review.
```

## Build and local QA

- `npm run package:store` → `dist/store/` (Load unpacked) + `dist/rag-moderation-assistant.zip` (upload).
- QA the folder before upload; optional `npm run verify:store-zip`. Details: [STORE_PACKAGING.md](./STORE_PACKAGING.md).

## Package

- MV3, all logic bundled — no remote JS ([MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)).
- Icons 16 / 48 / 128 included.
- Privacy policy URL: [extension/privacy](https://www.airesearchdog.net/extension/privacy) (source [PRIVACY_POLICY_EXTENSION.md](./PRIVACY_POLICY_EXTENSION.md); `npm run sync:privacy-policy` + `deploy:prod`)
- Terms of use URL (optional, recommended): [extension/terms](https://www.airesearchdog.net/extension/terms) (source [TERMS_EXTENSION.md](./TERMS_EXTENSION.md); `npm run sync:terms-extension` + `deploy:prod`)
- Contact / support URL (optional): [extension/contact](https://www.airesearchdog.net/extension/contact) (source [CONTACT_EXTENSION.md](./CONTACT_EXTENSION.md); `npm run sync:contact-extension` + `deploy:prod`)
- Privacy policy should describe:
  - User-provided text sent to your moderation API
  - Optional **BYOK**: user may supply a Google Gemini API key stored in `chrome.storage.local`; key sent over HTTPS for moderations; validation may call Google directly from the browser
  - No silent full-page scraping: page text only when the moderator uses **Click on Text to Moderate** or the selection context menu (with `activeTab` / user gesture)
- **Help / support URLs (optional):** static HTML on your domain (not remote code in the CRX); updates via `npm run sync:public-guides` + Universal `deploy:prod`, no new CRX required:
  - Install Chrome (Web Store): [install-chrome-extension](https://www.airesearchdog.net/extension/install-chrome-extension)
  - Install unpacked (dev only; not for listing): [install-chrome-extension-developer](https://www.airesearchdog.net/extension/install-chrome-extension-developer)
  - BYOK / Gemini key: [get-gemini-api-key](https://www.airesearchdog.net/extension/get-gemini-api-key)
  - Moderation workflow: [how-to-moderate-user-posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts)
  - Sideload QA: [how-to-test-extension](https://www.airesearchdog.net/extension/how-to-test-extension)
- **In the CRX (Options):** legal row links to Privacy, Terms, and Contact; store builds swap **Install** for **How to moderate**. Side panel: Gemini guide + Contact (Install hidden on store builds). URLs live in `lib/geminiKeyUserHelp.js`.

## Permissions justification

Dashboard: **Privacy practices** tab — paste each block into the matching justification field, then **Save draft**. Short table for skim; full copy in [Privacy practices justifications (paste)](#privacy-practices-justifications-paste).

| Permission | Why |
|------------|-----|
| `storage` | Persist feed location, environment profile |
| `sidePanel` | Main UI |
| `activeTab` | Read **current text selection** on the tab where the moderator opened the extension |
| `scripting` | Inject a one-shot snippet when moderator clicks **Click on Text to Moderate** to read clicked block or drag-selection |
| `contextMenus` | Right-click selected text → send to side panel |
| `tabs` | Resolve active tab; open side panel from context menu |
| `clipboardRead` | Paste button reads clipboard into content field (user click) |
| Optional host origins | Moderation API (local + production); **`https://*/*`** / **`http://*/*`** granted on demand when moderator uses **Click on Text to Moderate** |

### Privacy practices justifications (paste) {#privacy-practices-justifications-paste}

**activeTab**

```text
Required for pick mode: when the moderator clicks “Click here to select text you want to moderate” on the open tab, the extension may read only the text they click or drag-select on that tab to fill the moderation draft. Used with a user gesture on the active tab only—not for background tab monitoring or full-page scraping.
```

**clipboardRead**

```text
The side panel and Options include a Paste button. clipboardRead is used only after the moderator clicks Paste, to read clipboard text into “Content to moderate” or the optional Gemini API key field. The clipboard is not read on install, on a timer, or without that click.
```

**contextMenus**

```text
Registers one context-menu item, “Send selection to RAG Moderation,” when the user has highlighted text on a page. If they choose it, only that selection is copied into the side panel draft for review. No other menu entries or page modifications.
```

**scripting**

```text
Injects bundled, one-shot scripts on the active tab when the moderator starts pick mode, or (on Nextdoor moderation pages) when optional queue helpers need to read queue UI the moderator enabled in Options. Scripts capture only user-directed text or queue indicators for the moderation workflow; they are not persistent trackers and do not load remote code.
```

**sidePanel**

```text
The side panel is the extension’s only UI surface for moderation: enter or capture post text, add context, run Moderate, view keep/remove/maybe results and policy citations, and open help links. Without sidePanel the extension cannot perform its single purpose.
```

**storage**

```text
Saves moderator settings locally in chrome.storage (feed location, analysis type, BYOK Gemini key if provided, shared-pool trial counter, optional auto-nav preferences). Session storage holds short-lived pick-mode state. Data stays on the device in the user’s browser profile; it is not sold or used for ads.
```

**tabs**

```text
Identifies the active tab and window when the moderator uses pick mode, the “Send selection to RAG Moderation” context menu, or optional navigation helpers to the moderation feed. Opens or focuses the side panel in the correct window. Does not read page content except together with activeTab/scripting and an explicit moderator action.
```

**Host permission use** (if the form has one combined host field)

```text
https://nextdoor.com and https://*.nextdoor.com: Declared host access runs a bundled content script on Nextdoor only, for optional moderation-queue awareness and navigation helpers the moderator can disable in Options—all in service of reaching reported posts to moderate.

Optional origins (requested only when needed): https://www.airesearchdog.net for the Production moderation API, reCAPTCHA bridge page, and hosted help/legal pages; http://*/* and https://*/* when pick mode or API/BYOK setup requires temporary access to the tab’s origin or the user’s chosen API host. The moderator can deny optional hosts; capture and Moderate may not work on that site until granted.

No host access is used to build browsing profiles or to collect data unrelated to user-initiated moderation.
```

**https://nextdoor.com/*** and **https://\*.nextdoor.com/*** (if listed separately)

```text
Nextdoor is where moderators review neighborhood content. Host permission allows a bundled, Nextdoor-only content script for optional queue detection and feed navigation the moderator enables in Options. It does not read posts except as part of user-directed capture (pick mode/selection) for moderation.
```

**https://www.airesearchdog.net/*** (optional host)

```text
Store builds use Production only. This origin is the moderation API (HTTPS), reCAPTCHA bridge iframe, and static help/privacy pages. Moderation text and settings are sent here only when the moderator clicks Moderate (shared pool). Granted on first API use or as shown in the permission prompt.
```

**http://*/* ** and **https://*/*** (optional host)

```text
Pick mode may run on community sites beyond a fixed allowlist. These optional patterns are requested only when the moderator starts capture on a tab, so the extension can inject the bundled pick overlay on that page origin. Access is limited to user-initiated capture—not background crawling. The moderator may decline; pick mode on that site will not work until they allow.
```

## Dual publish

- Same ZIP → [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Same ZIP → Edge Partner Center (rebrand copy — see [EDGE_PORT.md](./EDGE_PORT.md))

## Extension ID and reCAPTCHA (shared pool)

- **Sideload QA** (unpacked `dist/store/` or release ZIP): extension ID is **path-specific** — allowlist per tester machine or use BYOK. Do not expect one ZIP download to work for shared-pool Moderate on every PC without allowlist updates.
- **Web Store listing:** after upload, copy the dashboard **extension ID** and add it **once** to `lib/recaptcha-bridge-extension-ids.json`, then `npm run sync:recaptcha-bridge` and Universal `npm run deploy:prod`. All store installs then pass the reCAPTCHA bridge for shared-pool Moderate.
- Details: [EXTENSION_IDS_SIDELOAD_VS_STORE.md](./EXTENSION_IDS_SIDELOAD_VS_STORE.md) · bridge steps: [RECAPTCHA_SETUP_EXTENSION.md](./RECAPTCHA_SETUP_EXTENSION.md)

## Pre-submit smoke

Follow [SMOKE_TEST.md](./SMOKE_TEST.md) on **production** profile after auth spike is done. For shared-pool **Moderate**, prefer an **unlisted store install** (real store ID) over unpacked sideload when validating reCAPTCHA end-to-end.
