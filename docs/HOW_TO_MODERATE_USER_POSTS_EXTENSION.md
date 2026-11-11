# How to use the extension to moderate user posts

**Overview.** This guide is for **community moderators** who already installed **RAG Moderation Assistant** in Chrome. It explains the day-to-day workflow: open the side panel, put post or comment text into the tool, run **Moderate**, and use the AI-assisted result as **input to your judgment**—not as the final platform decision. For installation or API keys, use the related guides at the end; for limits and liability, read **Important — AI-generated analysis** before you rely on any suggestion.

**Quick usage.** For a pictorial step-by-step guide with screenshots, see **[Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step)**.

## On this page {#toc}

- [Before you moderate](#before-you-moderate)
- [Go to Nextdoor](#go-to-nextdoor)
- [Open the side panel](#open-the-side-panel)
- [Confirm feed location](#confirm-feed-location)
- [Put post text in the panel](#put-post-text-in-the-panel)
- [Choose analysis settings](#choose-analysis-settings)
- [Run Moderate and watch progress](#run-moderate)
- [Read the results](#read-the-results)
- [Decision Breakdown and your call](#decision-breakdown)
- [When you agree: copy into Nextdoor Notes](#copy-notes)
- [After a run: clear, stop, or repeat](#after-a-run)
- [Optional: your Gemini key, reports, and feedback](#optional-byok-reports)
- [Related guides](#related)

---

## Before you moderate {#before-you-moderate}

You should have the extension **pinned** on the Chrome toolbar and be signed into the community site where you moderate. Only submit content you are **allowed** to review under your role and your platform’s rules.

Read **[Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis)** first. The tool can be wrong; you remain responsible for the outcome on the platform.

If you have not installed the extension yet, start with **[Install RAG Moderation Assistant in Google Chrome](https://www.airesearchdog.net/extension/install-chrome-extension)**. For your own Google quota, see **[Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key)**.

---

## Go to Nextdoor {#go-to-nextdoor}

In Chrome, open the Nextdoor site where you moderate. For most moderators, that is the neighborhood **news feed**, typically at **[https://nextdoor.com/news_feed/](https://nextdoor.com/news_feed/)**. Sign in if prompted so you can view the posts and comments you need to review.

Stay on the feed or post page you are working from before you open the extension side panel in the next step.

---

## Open the side panel {#open-the-side-panel}

Click the **RAG Moderation Assistant** icon in the Chrome toolbar (the pinned extension button after install). The **side panel** opens beside the page you are moderating so you can keep the post in view while you work.

If you do not see that icon, complete **[step 6 — Pin the extension to the toolbar](https://www.airesearchdog.net/extension/install-chrome-extension#pin-toolbar)** on the install guide: open the extensions menu, pin **RAG Moderation Assistant**, and confirm its icon stays visible in the extension toolbar area. Then return here and click the icon to open the panel.

The header shows **RAG Moderation**, a **connection** indicator for the moderation API, and **Options**. With a saved Gemini key, **Your key · On** indicates every run uses your key; with no key, **Your key · Off** means the shared allowance (see [Optional: your Gemini key, reports, and feedback](#optional-byok-reports)).

---

## Confirm feed location {#confirm-feed-location}

The first time you use the panel (or after reset), Chrome asks you to **Confirm feed location**. Pick the **US state** that matches the feed or region you moderate—for example, Oregon for an Oregon neighborhood feed. This **feed location** is sent with moderation requests so guidance can align with that locale.

You can change the state later from the **Feed location** control at the top of the main panel. Keep it accurate if you switch between feeds.

---

## Put post text in the panel {#put-post-text-in-the-panel}

All three methods fill **Content to moderate**. Use whichever fits the page:

**Paste.** Copy the post or comment text on the platform, then click **Paste** next to the content field (or paste with the keyboard). Good when the site makes copying easy.

**Click on Text to Moderate.** Click **Click on Text to Moderate**, then click the post or comment block on the page—or drag to select text. The extension reads that text into the panel. Chrome may ask for permission to access the tab; approve when prompted. Turn pick mode off by clicking the button again if you need to.

**Right-click selection.** Select text on the page, right-click, and choose **Send selection to RAG Moderation**. The side panel opens (or focuses) with that text loaded.

Do not use these tools on pages or content outside your moderation duties.

---

## Choose analysis settings {#choose-analysis-settings}

**Analysis**

- **Quick** — Faster, lighter review when you need a rapid read.
- **Detailed** — Deeper reasoning when the case is borderline or you want more explanation in the result.

**Bad Words pre-screen (via Universal)** — When checked (default), text may be checked against a bad-words list before or alongside AI analysis. Turn it off only if you intentionally want to skip that step.

Most moderators leave defaults until they learn what works for their queue.

---

## Run Moderate and watch progress {#run-moderate}

When **Content to moderate** is filled, click **Moderate**. A progress line shows elapsed time; use **Stop** to cancel a long request. The panel uses your **timeout** from Options (default 45 seconds).

If you run the **same text** again with the **same settings**, the panel may show the previous result instead of calling the API again. Change the text, analysis type, bad-words toggle—or click **Clear content**—to force a fresh run.

Connection errors usually mean the API is unreachable, host permission was denied, or you need to check **Options → Advanced → Profile** (Production for normal use).

---

## Read the results {#read-the-results}

When the run finishes, the **Results** section appears below the buttons. You typically see:

- **Decision** — the labeled line under the report-action buttons (for example **Remove**, **Maybe Remove**, or **Keep**).
- **Reason** — the main rationale, with a **Copy** button beside it.
- **Breakdown** — optional longer explanation, also with **Copy**, when the run returns one.
- Links or actions when the server **saved a full report** (production setup).

Scan the summary first, then drill into sections that matter for the case at hand.

---

## Decision Breakdown and your call {#decision-breakdown}

Open or scroll to **Breakdown** in **Results** to see **why** the model leaned a certain way—which rules or snippets weighed in, and how the text was interpreted.

Use that breakdown to **double-check** the AI, not to skip reading the actual post. Compare the reasoning to your platform’s current guidelines and the full thread context. If the AI missed sarcasm, local norms, or a policy exception, **your** decision overrides the suggestion.

When anything looks wrong, use **Review this report** (when a saved report exists) to send feedback, or note the case for your team’s process.

---

## When you agree: copy into Nextdoor Notes {#copy-notes}

On Nextdoor, the moderation report includes **Notes — Additional Info**. Use the extension to fill that field **only when you agree with the Reason** after reading the post and the **Decision** / **Breakdown** sections—not when you are overriding the tool or still unsure.

1. Run **Moderate** and wait for **Results** (report-action buttons may appear above the **Decision** label).
2. Read the **Decision** line and the **Reason** below it.
3. If you **agree with the Reason**, click **Copy** beside **Reason**, open the Nextdoor report, click into **Notes — Additional Info**, and paste (**Ctrl+V** / **Cmd+V**). Edit briefly if your team expects shorter or local wording—you remain responsible for what you submit.
4. If you **do not** agree with the Reason, do **not** paste it—write your own notes instead, or use **Review this report** when that button is available.

If **Copy** does nothing, allow clipboard access when Chrome prompts, or select the **Reason** text in the panel and copy manually.

---

## After a run: clear, stop, or repeat {#after-a-run}

**Clear content** empties the content field (and related draft state) so you can moderate the next item without stale text.

**Stop** cancels an in-flight request.

Move to the next post by capturing new text with paste, pick mode, or the context menu—then **Moderate** again.

---

## Optional: your Gemini key, reports, and feedback {#optional-byok-reports}

**Your Gemini key** — With a key saved in **Options**, the header shows **Your key · On** and moderations use your Google quota. Use **Remove key** in Options to use the small shared allowance again; see the privacy policy and Gemini guide for details.

**Report email** — Optionally save an email in **Options** or when prompted. Then, on results tied to a **saved report**, **Email report** can send you a copy of the full moderation report.

**Options autosave** — Preferences save as you change them (or when you close Options); there is no separate **Save all** control.

**Backup settings** — In **Options**, use **Export settings** to save a JSON file of your preferences (state, API profile, provider, report email, and similar). **Import settings** restores from that file. The file **does not contain your Gemini API key**; add your key again in Options after import if you use BYOK. Treat the file as private—it can include your email and location. After importing a Local or Custom API profile on a dev build, grant host permission again if prompted.

**Review this report** — Opens a short feedback form when the API stored a report id. Your comment is recorded as needing improvement and may be included in an acknowledgement email if report email is set.

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step) | Screenshots: capture text, Moderate, Results |
| [Install RAG Moderation Assistant in Chrome](https://www.airesearchdog.net/extension/install-chrome-extension) | First-time Web Store install and pin |
| [Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key) | Optional BYOK for regular volume |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Required reading before acting on suggestions |
