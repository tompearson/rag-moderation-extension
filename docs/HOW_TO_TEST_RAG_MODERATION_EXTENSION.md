# How to test the RAG Moderation Extension

**Overview.** This guide is for **sideload testers** validating a **Production** build (GitHub release ZIP or `dist/store/`). You check that **features work**—UI, permissions, API calls, email, contact, and feedback—not whether the AI picked the “correct” Remove/Keep label.

Install the build first: **[Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer)**. For day-to-day moderation usage, see **[How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts)**.

## On this page {#toc}

- [How we test](#how-we-test)
- [Before you test](#before-you-test)
- [Critical path (about 10 minutes)](#critical-path)
- [Feature checklists](#feature-checklists)
- [Negative checks](#negative-checks)
- [What we are not testing](#out-of-scope)
- [Screenshots](#screenshots)
- [Related guides](#related)

---

## How we test {#how-we-test}

| Strategy | What you do |
|----------|-------------|
| **Critical path** | Run the short ordered smoke below first. |
| **Checklists** | Use the tables; mark **Pass**, **Fail**, or **Skip** on each row. |
| **Build ID** | Note the version in the side panel / Options and the GitHub release tag. |
| **Risk order** | Onboarding → capture → moderate → saved-report buttons → Options → Contact. |
| **Regression** | Re-run the critical path after every new release ZIP. |
| **Out of scope** | AI decision quality, guideline wording, RAG retrieval accuracy. |

**Sample text:** `Block party Saturday on Oak Street — neighbors welcome!` — enough to get **Results** (any decision label is fine).

---

## Before you test {#before-you-test}

1. Install the **sideload** build using **[Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer.html)** — download and unzip the release ZIP, turn on **Developer mode** in `chrome://extensions`, **Load unpacked** on the folder that contains `manifest.json`, and pin **RAG Moderation Assistant** on the toolbar. That guide also covers the release-email flow (SHA256, **Assets** download). Store-shaped builds already target **Production** (`https://www.airesearchdog.net`); you do not need Local dev in Options.
2. Keep a simple pass/fail list (spreadsheet or printed tables below).
3. Navigate to your main feed: **[nextdoor.com/news_feed/](https://nextdoor.com/news_feed/)**. If you do not have a Nextdoor account, you cannot complete testing that depends on a live neighborhood feed. The **RAG Moderation Assistant** is built for **Nextdoor web pages** and the **training documents** on this site—not generic sites for **Click on Text to Moderate** and context-menu capture.
4. For **saved report** actions (Open / Email / Review), Production must persist reports—if buttons never appear, moderate once more and check for the hint about missing saved records.

---

## Critical path (about 10 minutes) {#critical-path}

| # | Step | Expected |
|---|------|----------|
| 1 | Complete **[Part 1 — Enable an unpacked extension](https://www.airesearchdog.net/extension/install-chrome-extension-developer.html#developer)** (Developer mode, **Load unpacked**, enable the card, pin the toolbar icon) | Extension pinned; open the **side panel** — version label visible; connection badge leaves “Connecting…” |
| 2 | Complete **Confirm feed location** (first run) | Main panel enabled; state shows in **Feed location** |
| 3 | **Paste** sample text into **Content to moderate** | Field filled |
| 4 | **Quick** analysis → **Moderate** | **Results**: **Decision** + **Reason** (label does not matter) |
| 5 | **Copy** beside **Reason** | Clipboard updates or manual copy works |
| 6 | Open **Options** | Production profile; Privacy/Terms links work |
| 7 | **Contact** → short test message → **Send** | Success status (no client error) |

![Side panel ready: feed location set](/extension/images/how-to-moderate-walkthrough-01-panel-ready.png)

![Content filled, ready to Moderate](/extension/images/how-to-moderate-walkthrough-03-content-ready.png)

![Results with report actions and Reason](/extension/images/how-to-moderate-walkthrough-04-results.png)

---

## Feature checklists {#feature-checklists}

Mark each row Pass / Fail / Skip.

### A. Install and shell

| Feature | Step | Expected |
|---------|------|----------|
| Version | Open side panel / Options | Version matches release (e.g. `v0.2.8`) |
| Connection | Open panel on an https tab | Badge shows connected Production API |
| Header links | **How to moderate**, **Get a Gemini key**, **Contact** | Correct `airesearchdog.net/extension/...` pages |
| Options entry | **Options** from panel | Options tab; Privacy / Terms in footer |

### B. First-run onboarding

| Feature | Step | Expected |
|---------|------|----------|
| Feed location modal | First open or after reset | Modal; main blocked until save |
| Save state | State → **Save and continue** | Modal closes; **Feed location** matches |
| Persistence | Close and reopen panel | No modal; state kept |
| Change location | Change **Feed location** on panel | Saves; next **Moderate** completes (no UI error) |

### C. Report email onboarding (optional)

| Feature | Step | Expected |
|---------|------|----------|
| Modal dismiss | **Not now** / × / Escape | Continues; modal not shown every open |
| Save email | Valid email → **Save** | Stored; modal does not repeat on reopen |
| Options sync | Options → report email field | Same address |

### D. Content capture

| Feature | Step | Expected |
|---------|------|----------|
| Paste | **Paste** | Content filled |
| Pick mode | **Click on Text to Moderate** → allow host → click/drag | Content updated; pick mode exits; **Esc** cancels cleanly |
| Context menu | Select text → **Send selection to RAG Moderation** | Panel opens/focuses with text |
| Post context | Open **Post context** → enter text | Field holds text; **Moderate** succeeds |
| Clear | **Clear content** | Field empty |

![Pick mode active](/extension/images/how-to-moderate-walkthrough-02-pick-mode.png)

### E. Moderate controls (not AI QA)

| Feature | Step | Expected |
|---------|------|----------|
| Quick / Detailed | Switch **Analysis** → **Moderate** | Both finish; **Results** show |
| Bad words | Toggle **Bad Words** off/on | Both runs complete |
| In flight | **Moderate** → **Stop** | Cancels; UI idle |
| Duplicate run | Same text twice | Cached or new run—either OK |
| Timeout | (Optional) Lower timeout in Options | Clear error if exceeded |

### F. Results UI

| Feature | Step | Expected |
|---------|------|----------|
| Structure | After moderate | **Decision**, **Reason**; **Breakdown** if returned |
| Copy | **Copy** on Reason/Breakdown | Clipboard works |
| Links | Test string includes `https://example.com` | Links clickable in Reason/Breakdown |
| Scroll | Long result | Results scroll; panel scrolls to results after run |

### G. Saved report actions

| Feature | Step | Expected |
|---------|------|----------|
| Save prerequisite | **Moderate** on Production | Action row when report saved |
| Open full report | **Open full report** | New tab; report view loads |
| Email report | Report email on → **Email report** | Success status; mail received |
| Review | **Review this report** → rating → **Send it** | Success; modal closes |
| No saved id | If hint shown | UI explains need for saved Production report |

### H. Options (sideload / store)

| Feature | Step | Expected |
|---------|------|----------|
| Production lock | Advanced → Profile | No Local/Custom; Production note |
| Provider | Change provider → **Save all settings** | Persists after reload |
| Moderation timeout | Change timeout → save | Persists |
| Report email toggle | Turn **Email report** off | Email button hidden; Open/Review remain when id exists |
| Feed location | Options state picker | Matches panel; **Reset location** shows modal again |
| Factory reset | **Reset to clean state** | Onboarding flows return |

![Options: version, timeout, report email](/extension/images/how-to-test-options-report-timeout.png)

![Options: feed location, save, reset](/extension/images/how-to-test-options-feed-save.png)

Use a **placeholder report email** (or blur) in public screenshots if you prefer not to show a personal address.

Still useful for checklist **H** (Production + provider): one crop with **Advanced** expanded on a **store/sideload** build showing the Production note and **Platform intelligence** provider (`how-to-test-options-advanced-production.png` — add when captured).

### I. Contact

| Feature | Step | Expected |
|---------|------|----------|
| Side panel | **Contact** → message → **Send** | Success |
| Options | **Contact** in Options footer | Same behavior |
| Reply email | Check **want a reply** → email → send | Optional row works |

_Screenshot (capture during QA): Contact modal with message ready to send._

### J. BYOK (optional)

| Feature | Step | Expected |
|---------|------|----------|
| Invalid key | Bad key → **Save key** | Error; not stored |
| Valid key | **Save key** → **Turn on my key** | **Your key · On** in header; toggle works |
| Remove | **Remove key** | Badge gone; moderate without BYOK |

![Options: Gemini BYOK (optional)](/extension/images/how-to-test-options-gemini-byok.png)

Details: **[Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key)** and **[BYOK_GEMINI.md](https://github.com/tompearson/rag-moderation-extension/blob/master/docs/BYOK_GEMINI.md)** (repo).

---

## Negative checks {#negative-checks}

| Step | Expected |
|------|----------|
| Deny host permission when prompted for pick/moderate | Clear error; no silent hang |
| **Stop** during **Moderate** | Request cancels |
| Invalid report email in modal | Validation error |
| **Esc** during pick mode | Pick cancelled; prior content restored if empty |

---

## What we are not testing {#out-of-scope}

- Whether **Remove**, **Keep**, or **Maybe Remove** matches your platform rules.
- Quality of **Reason**, **Breakdown**, or retrieved guideline snippets.
- Comparative scoring of **Quick** vs **Detailed** reasoning.
- Load testing or concurrent moderators.

---

## Screenshots {#screenshots}

This page reuses the [visual walkthrough](https://www.airesearchdog.net/extension/visual-moderation-step-by-step) images for panel, pick, and results.

| File | Status |
|------|--------|
| `how-to-test-options-report-timeout.png` | In repo |
| `how-to-test-options-feed-save.png` | In repo |
| `how-to-test-options-gemini-byok.png` | In repo (optional § J) |
| `how-to-test-options-advanced-production.png` | Still needed — Advanced open, Production + provider |
| `how-to-test-contact-modal.png` | Still needed |

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer) | Load the release ZIP |
| [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts) | Moderator workflow (not QA) |
| [Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step) | Picture walkthrough |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Liability / limits |
| [Maintainer smoke matrix (GitHub)](https://github.com/tompearson/rag-moderation-extension/blob/master/docs/SMOKE_TEST.md) | Local dev, curl, BYOK depth |

---

**Note:** Maintainers run the fuller matrix in the repo before tags and store submission. Testers on sideload builds can use this page alone for release sign-off.
