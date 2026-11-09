# Get a Gemini API key for moderation

<div class="guide-preface-card" role="note">
<p class="guide-preface-card__label">Before you begin</p>
<p><strong>RAG Moderation Assistant</strong> must already be <strong>installed and available</strong> in Google Chrome (Web Store install, pinned toolbar icon, side panel). This guide does not walk through installation.</p>
<p>If the extension is not installed yet, complete <a href="https://www.airesearchdog.net/extension/install-chrome-extension">Install RAG Moderation Assistant in Google Chrome</a> first, then return here.</p>
</div>

Use your own Google Gemini API key (BYOK) so moderations use **your** Google quota instead of the shared pool. This guide is for the **RAG Moderation Assistant** Chrome extension only.

Official key page: [Google AI Studio — API keys](https://aistudio.google.com/apikey)

This guide covers **getting a Google key** and **saving it in Options**.

## Part 1 — Obtain a key from Google {#google}

1. **Sign in**  
   Open [Google AI Studio](https://aistudio.google.com/) and sign in with your Google account.

2. **Accept terms**  
   If this is your first visit, review and accept the developer terms and conditions.

3. **Open the API keys area**  
   Click **Get API key** or the key icon (often in the top-left menu or bottom-left of the dashboard).

4. **Create a key**  
   Click **Create API key**.

5. **Choose a Google Cloud project**  
   Create the key in a **new** Google Cloud project, or pick an **existing** project from the list. Either is fine for personal moderation use; quota and billing apply to that project.

6. **Name and copy the key**  
   Give the key a name you will recognize (for example `RAG moderation BYOK`), confirm creation, and **copy** the full key string.  
   Google shows it once in full — if you lose it, create a new key in AI Studio.  
   Do not email the key, post it in chat, or store it where others can read it. Paste it only in the extension **Options** on your machine.

You now have a Gemini API key on the clipboard (or saved in your password manager until you paste it).

---

## Part 2 — Add your key in the extension {#options}

For **RAG Moderation Assistant**: the key stays in **this browser only**; it is not saved on the moderation website server.

1. **Open the extension Options page**  
   From the side panel, click **Options**.

2. **Go to “Your Gemini API key (recommended)”**  
   Scroll to that section.

3. **Paste the key**  
   If you prefer the shared pool and do not want a personal key yet, then you may begin moderating now.  
   Click in the **Gemini API key** field and paste (`Ctrl+V` / `Cmd+V`), or use **Paste** to read from the clipboard.  
   The status line may show the **last four characters** once so you can confirm the right key; the full key is not shown again after save.

![Options: Gemini API key field after paste, before Save key](/extension/images/get-gemini-options-paste-key.png)

4. **Start moderating**  
   When your key is saved (or if you are using the shared pool), follow **[Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step)** to capture post text, click **Moderate**, and read the results.

### Extension quick checks

| Goal | What to verify |
|------|----------------|
| Key saved | Options shows **A key is saved** under the field; **Remove key** is available |
| Key in use | Side panel **Your key · On**; moderation does not fail with missing-key errors |
| Key stored, shared pool | Checkbox **Turn on my key for moderations** off; side panel **Your key · Off** |
| New key | Paste over the field and **Save key** again, or **Remove** then save |
| New browser / PC | Keys do **not** sync — repeat this part on each install |

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step) | Screenshots: capture text, Moderate, results |
| [Install RAG Moderation Assistant in Chrome](https://www.airesearchdog.net/extension/install-chrome-extension) | Web Store install and pin |
| [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts) | Side panel workflow |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Read before acting on moderation suggestions |
