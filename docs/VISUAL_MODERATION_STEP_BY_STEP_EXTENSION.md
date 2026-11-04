# Visual moderation step by step

**Overview.** Four screenshots of one moderation pass in the **RAG Moderation Assistant** side panel: capture text, run **Moderate**, read **Results**. Screenshots show this help site in the background as a demo—the same steps apply on the site where you moderate (for example Nextdoor). Images on this page use a **wider layout** (up to about **1024px**) so the side panel stays readable. When you capture new shots, zoom in with **Ctrl** + mouse wheel before screenshotting if you want larger UI in the image file itself.

For full written detail (paste, settings, Nextdoor Notes, feedback), see **[How to use the extension to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts)**.

## On this page {#toc}

- [Before you start](#before-you-start)
- [Step 1 — Open the panel](#step-1)
- [Step 2 — Pick text on the page](#step-2)
- [Step 3 — Review and Moderate](#step-3)
- [Step 4 — Read Results](#step-4)
- [Related guides](#related)

---

## Before you start {#before-you-start}

Complete these first:

- **[Install RAG Moderation Assistant in Google Chrome](https://www.airesearchdog.net/extension/install-chrome-extension)** — install from the Web Store and **[pin the extension](https://www.airesearchdog.net/extension/install-chrome-extension#pin-toolbar)** to the toolbar.
- **[Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis)** — required reading; AI output is input to your judgment, not the final platform decision.
- **[Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key)** (optional) — recommended if you moderate regularly or want your own Google quota.

Sign in to the community site where you moderate. Only capture content you are allowed to review under your role.

---

## Step 1 — Open the panel {#step-1}

Open the **RAG Moderation Assistant** side panel on the item you are reviewing. Confirm **Feed location**, then start with an empty **Content to moderate** field. You can use **Paste** or the blue **Click on Text to Moderate** button.

![Side panel ready to moderate: feed location set and empty content field with Click on Text to Moderate](/extension/images/how-to-moderate-walkthrough-01-panel-ready.png)

---

## Step 2 — Pick text on the page {#step-2}

Click **Click on Text to Moderate**. The button turns gray (**Click text on the page…**) and a banner on the page reminds you to **click on the text you want to capture**. Press **Esc** on the page or in the panel to cancel pick mode.

![Pick mode active: gray pick button in the side panel and capture banner on the page](/extension/images/how-to-moderate-walkthrough-02-pick-mode.png)

---

## Step 3 — Review and Moderate {#step-3}

Review the captured text, then click **Moderate**. Adjust **Analysis** or **Bad Words pre-screen** first if you need to.

**Moderate button behavior.** When **Content to moderate** is filled and this text/settings combo has not been run successfully yet, **Moderate** pulses blue (about a **2 second** cycle)—the same attention cue as **Quick Analysis** on the full moderation tool—so you know it is ready. After you change the text or settings, or after **Clear content**, it pulses again when a fresh run is available. It does **not** pulse while a request is already in flight or when the panel is showing the cached result for the same input.

**While moderating.** After you click **Moderate**, the button disables, **Stop** can cancel the request, and **Click on Text to Moderate** stays grayed out until the run finishes (success or error). A progress line shows elapsed time up to your Options timeout.

![Content to moderate filled with captured text, ready to click Moderate](/extension/images/how-to-moderate-walkthrough-03-content-ready.png)

---

## Step 4 — Read Results {#step-4}

**Results** appear below the action buttons. Check the **Decision** label and outcome, **Reason** (use **Copy** if you agree—see [When you agree: copy into Nextdoor Notes](https://www.airesearchdog.net/extension/how-to-moderate-user-posts#copy-notes)), and **Breakdown**. When the API saved a full report, use **Open full report**, **Email report**, or **Review this report** above the **Decision** line.

![Moderation results with Decision Maybe Remove, Reason, Breakdown, and report action buttons](/extension/images/how-to-moderate-walkthrough-04-results.png)

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [How to use the extension to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts) | Full workflow, settings, and Nextdoor Notes |
| [Install RAG Moderation Assistant in Chrome](https://www.airesearchdog.net/extension/install-chrome-extension) | First-time install and pin |
| [Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key) | Optional BYOK for regular volume |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Required reading before acting on suggestions |
