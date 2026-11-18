# Store readiness checklist

**Maintainer map (ZIPs, releases, on-site download):** [EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md](./EXTENSION_BUILD_AND_RELEASE_OVERVIEW.md)

## Table of contents

- [Program policies pre-review (read first)](#program-policies-pre-review-read-first)
- [Prepare your extension (official guide)](#prepare-your-extension-official-guide)
- [Publish your extension (official guide)](#publish-your-extension-official-guide)
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
- [ ] Listing screenshots and long description drafted (dashboard, not manifest).
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
- [ ] **Support / contact** — `https://www.airesearchdog.net/extension/contact` or `help@airesearchdog.net`.

Manifest already ships **name**, **short description** (≤132 chars), and **icons** — listing copy can expand, but should not contradict the manifest.

#### Privacy / Privacy practices

Google’s [publish](https://developer.chrome.com/docs/webstore/publish) doc calls this the **Privacy** tab; the form is documented as [Privacy practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).

- [ ] **Single purpose** — paste or adapt:

  > RAG Moderation Assistant helps community moderators review user posts: capture or paste post text in a side panel, send it to a moderation API, and show an AI-assisted keep/remove suggestion with retrieved policy excerpts. It does not browse the web on its own; the moderator chooses what text to moderate.

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

## Dual publish

- Same ZIP → [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- Same ZIP → Edge Partner Center (rebrand copy — see [EDGE_PORT.md](./EDGE_PORT.md))

## Extension ID and reCAPTCHA (shared pool)

- **Sideload QA** (unpacked `dist/store/` or release ZIP): extension ID is **path-specific** — allowlist per tester machine or use BYOK. Do not expect one ZIP download to work for shared-pool Moderate on every PC without allowlist updates.
- **Web Store listing:** after upload, copy the dashboard **extension ID** and add it **once** to `lib/recaptcha-bridge-extension-ids.json`, then `npm run sync:recaptcha-bridge` and Universal `npm run deploy:prod`. All store installs then pass the reCAPTCHA bridge for shared-pool Moderate.
- Details: [EXTENSION_IDS_SIDELOAD_VS_STORE.md](./EXTENSION_IDS_SIDELOAD_VS_STORE.md) · bridge steps: [RECAPTCHA_SETUP_EXTENSION.md](./RECAPTCHA_SETUP_EXTENSION.md)

## Pre-submit smoke

Follow [SMOKE_TEST.md](./SMOKE_TEST.md) on **production** profile after auth spike is done. For shared-pool **Moderate**, prefer an **unlisted store install** (real store ID) over unpacked sideload when validating reCAPTCHA end-to-end.
