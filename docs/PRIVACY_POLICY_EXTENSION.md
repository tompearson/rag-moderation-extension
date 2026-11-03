# Privacy Policy — RAG Moderation Assistant (Chrome / Edge extension)

**Last updated:** November 3, 2026  
**Operator:** airesearchdog (“we,” “us”)  
**Contact:** [admin@airesearchdog.net](mailto:admin@airesearchdog.net)  

## Summary

This extension helps **community moderators** analyze text they choose to submit. It does **not** sell your data or run advertising analytics inside the extension. When you run **Moderate**, that text is sent over HTTPS to **airesearchdog’s moderation service**. Optional features may store a **report email** or **Google Gemini API key** on your device.

## Who this is for

The extension is intended for **moderators and administrators**, not for general consumer browsing. You should only moderate content you are allowed to handle under your platform’s rules and applicable law.

## Costs, quotas, and your Gemini key

**Free moderations in the extension (your key off).** When **Your key · Off**, airesearchdog currently provides **up to 5 moderations** per install using shared AI capacity at no charge from us. That allowance may change in a future update. After it is used, or if shared capacity is unavailable, you can add your own Gemini key or try again later when limits reset.

**Personal Gemini key (optional).** If you save your own Gemini API key and turn it on, each moderation and key check uses **your** Google project. That can **incur charges** if billing is enabled or if you go beyond what Google includes for free. For **free API keys** from Google AI Studio, applicable **usage limits, rate limits, and quotas** are those **Google publishes** for the Gemini API (including separate meters for different models and features). Google may change those limits at any time; see [Google AI Studio](https://aistudio.google.com/) and Google’s published [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) for the current rules—not airesearchdog’s.

**Switching modes.** You can turn your key on or off in the side panel or Options, or remove the key, to choose between the extension’s shared allowance and your own Google quota.

## Information the extension processes

| Category | Examples | Where it goes |
|----------|----------|----------------|
| **Content you submit** | Text in “Content to moderate,” optional “Post context,” text from paste, clipboard (Paste button), page selection, or “Click on Text to Moderate” | Sent when you click **Moderate**; shown in the side panel until you clear it |
| **Moderation settings** | US state (“feed location”), analysis type (quick/detailed), bad-words pre-screen toggle, RAG provider choice, API environment (Production / Local dev / Custom) | Stored in **`chrome.storage.local`** on your device |
| **Optional report email** | Email address for “Email report” | Stored locally; may be sent with moderation requests and when you email a report |
| **Optional Gemini API key (BYOK)** | Key you paste in Options | Stored locally in **`chrome.storage.local`**; sent to Google (validation) and to airesearchdog’s API when “use my key” is on |
| **Dev identifiers (Advanced)** | `moderatorId`, `deviceId` defaults or values you set | Stored locally; sent with each moderation request |
| **Feedback you choose to send** | Comment on “Review this Decision” | Sent to airesearchdog’s API with a random **`feedbackSessionId`** in **`chrome.storage.session`** (browser session, not synced across devices) |
| **Short-lived session data** | Pending draft from context menu, active tab id for pick mode | **`chrome.storage.session`**; cleared when the browser session ends |

The extension does **not** use `chrome.storage.sync`. It does **not** include third-party analytics or crash-reporting SDKs in the extension package.

## What stays on your device

Stored in **local extension storage** until you change or remove it:

- Feed location and onboarding flags  
- Environment profile and custom API origin (if set)  
- Gemini API key and “use my key for moderations” toggle (if you save one)  
- Report email and related options  
- Timeout and other preferences  

**Reset extension** (Options) wipes saved settings, sets profile to Production, and revokes optional host permissions you granted for API hosts. It does **not** clear text already in an open side panel—you must use **Clear content** or close the panel.

## What is sent to servers

### 1. Moderation API

When you click **Moderate**, the extension sends HTTPS requests to **airesearchdog’s API**, including:

- The **content** and optional **post context** you entered  
- **Feed location** (US state)  
- Provider / analysis settings  
- **`moderatorId`** and **`deviceId`**  
- **`emailReport: true`** (so the service can associate a saved report when the server is configured to store moderations)  
- Optional **`reporterEmail`** if you saved one  
- Optional **`userApiKey`** if BYOK is enabled  

airesearchdog may **store** submitted content, decisions, and report metadata in databases and logs according to our service configuration and policies. Saved reports may receive a **`moderationHistoryId`**, which enables **Open full report**, **Email report**, and **Review this Decision** in the extension.

If you set a **Custom** API origin in Options (for local development or another deployment), your data is sent to **that** server instead; airesearchdog does not control third-party deployments.

### 2. Report and feedback actions (only when you use them)

- **Email report:** sends report id and recipient email to airesearchdog’s API.  
- **Review this Decision:** sends your comment, report id, session id, and optional reporter email to airesearchdog’s API.

### 3. Google Gemini (optional)

If you save a Gemini key, the extension may call **`generativelanguage.googleapis.com`** directly from your browser to **validate** the key (minimal test requests; optional RAG-style embed/chat probes). If BYOK is on during moderation, your key is also sent to airesearchdog’s API so Google can process embed/chat for that request. Extension BYOK keys are **not** stored in the separate web app’s moderator database. Google’s use of data is governed by [Google’s policies](https://policies.google.com/privacy) and your Google Cloud / AI Studio terms.

When BYOK is **off**, moderations use the **shared pool** described under [Costs, quotas, and your Gemini key](#costs-quotas-and-your-gemini-key). Content still goes to airesearchdog’s API and may be processed by Google on the server side.

### 4. Help links

The side panel and Options may open **help pages** we host (for example, how to get a Gemini key or install the extension). Opening those pages does not by itself send moderation content.

## Access to web pages

The extension **does not** read entire pages in the background.

- **`activeTab` / `scripting`:** Used only when **you** use **Click on Text to Moderate** or similar capture on the **current tab**, to read the text you click or drag-select.  
- **Context menu:** “Send selection to RAG Moderation” sends **only the selected text** into the side panel draft.  
- **Optional host permissions** (`http(s)://…`): Requested when needed so capture or API calls can reach the tab origin or your chosen API host. You can deny or revoke them in the browser; some features will not work without the relevant permission.

We do **not** receive a continuous feed of your browsing history through this extension.

## Clipboard

The **Paste** button (and clipboard permission) reads the clipboard **only when you click Paste**, to fill the content field. We do not read the clipboard otherwise.

## Children

The extension is not directed at children under 13 (or the age required in your jurisdiction). Moderation tools are intended for adult moderators.

## Security

Data in transit uses **HTTPS** where supported. Keys and settings rely on **your operating system and browser profile** security. Anyone with access to your logged-in user account on the device could read extension storage.

## Your choices

- Do not install or use the extension if you do not agree.  
- Avoid pasting content you are not authorized to process.  
- Turn off BYOK or **Remove key** / **Reset extension** to clear local secrets.  
- Use **Clear content** to remove draft text in the panel.  
- Revoke host permissions in Chrome/Edge extension settings.

## Changes

We may update this policy when the extension or API behavior changes. We will post the new date at the top and, where required, notify users through the store listing or extension update notes.

## Contact

Privacy and extension questions: **[admin@airesearchdog.net](mailto:admin@airesearchdog.net)**.

Do not use this address to submit posts for moderation; the email moderation product uses separate intake addresses documented on the Community Moderation Tool site.
