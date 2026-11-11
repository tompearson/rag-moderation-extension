# Get a Gemini API key for moderation

Before you begin

**RAG Moderation Assistant** must already be **installed and available** in Google Chrome (Web Store install, pinned toolbar icon, side panel). This guide does not walk through installation.

If the extension is not installed yet, complete [Install RAG Moderation Assistant in Google Chrome](https://www.airesearchdog.net/extension/install-chrome-extension) first, then return here.

Use your own Google Gemini API key (BYOK) so moderations use **your** Google quota instead of the shared pool. This guide is for the **RAG Moderation Assistant** Chrome extension only.

Official key page: [Gemini API key in Google AI Studio](https://aistudio.google.com/docs/api-key)

This guide covers **getting a Google key** and **saving it in Options**.

## On this page {#toc}

- [Part 1 — Obtain a key from Google](#google)
- [Part 2 — Add your key in the extension](#options)
- [Related guides](#related)

---

## Part 1 — Obtain a key from Google {#google}

Note: beacuse  you are obtaining a free Gemini API key do not provide any billing information if asked.

1. **Open the API key page**

   Go to [Gemini API key in Google AI Studio](https://aistudio.google.com/docs/api-key) and sign in with your Google account if prompted.  
      On that page, click **Create or view a Gemini API Key** (Google’s label for starting or opening your keys).
2. **Name and copy the key**

   Give the key a name you will recognize (for example `RAG moderation BYOK`), confirm creation, and **copy** the full key string.  
      Google shows it once in full — if you lose it, create a new key in AI Studio using the same proceedure.  
      Do not email the key, post it in chat, or store it where others can read it. Paste it only in the extension **Options** on your machine.

You now have a Gemini API key on the clipboard (or saved in your password manager until you paste it).

---

## Part 2 — Add your key in the extension {#options}

**Launch the extension first:** In `chrome://extensions`, **RAG Moderation Assistant** must be **enabled on its card** (and pinned on the toolbar if you open it from there) before **Options** and the side panel work. For unpacked / sideload installs, follow step 6 — **[Enable the extension on its card](https://www.airesearchdog.net/extension/install-chrome-extension-developer#enable-extension-card)** — in [Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer#developer).

For **RAG Moderation Assistant**: the key stays in **this browser only**; it is not saved on the moderation website server.

1. **Open the extension Options page**

   From the side panel, click **Options**.
2. **Go to “Your Gemini API key (recommended)”**

   Scroll to that section.
3. **Paste the key**

   Click in the **Gemini API key** field and paste (`Ctrl+V` / `Cmd+V`), or use **Paste** to read from the clipboard.  
      The status line may show the **last four characters** once so you can confirm the right key; the full key is not shown again after save. Your key will never be exported using the Options/Bakcup settings.

![Options: Gemini API key field after paste, before Save key](/extension/images/get-gemini-options-paste-key.png)

4. **Start moderating**

   When your key is saved (or if you are using the shared pool), follow **[Visual moderation step by step](https://www.airesearchdog.net/extension/visual-moderation-step-by-step)** to capture post text, click **Moderate**, and read the results.

### Extension quick checks

| Goal | What to verify |
|------|----------------|
| Key saved | Options shows **A key is saved** under the field; **Remove key** is available |
| Key in use | Side panel **Your key · On**; every moderate sends your key |
| Return to shared pool | **Remove key** in Options; side panel **Your key · Off** |
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
