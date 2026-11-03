# Get a Gemini API key for moderation

**Note:** We recommend you [install the RAG Moderation Assistant Chrome extension](https://www.airesearchdog.net/extension/install-chrome-extension) **before** you obtain your Gemini API key.

Use your own Google Gemini API key (BYOK) so moderations use **your** Google quota instead of the shared pool. This guide is for the **RAG Moderation Assistant** Chrome extension only.

Official key page: [Google AI Studio — API keys](https://aistudio.google.com/apikey)

---

## Part 1 — Obtain a key from Google

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

## Part 2 — Chrome extension {#extension}

For **RAG Moderation Assistant**: the key stays in **this browser only**; it is not saved on the moderation website server.

1. **Open the extension Options page**  
   From the side panel, click **Options**, or use the extension’s Options entry in the browser toolbar menu.

2. **Go to “Your Gemini API key (recommended)”**  
   Scroll to that section (or click **Your key · Off** in the side panel when no key is saved — Options opens to this section).

3. **Paste the key**  
   Click in the **Gemini API key** field and paste (`Ctrl+V` / `Cmd+V`), or use the **Paste** button to read from the clipboard.  
   After paste, the status line may show the **last four characters** once so you can confirm the right key; it is not shown again anywhere.

4. **Save key**  
   Click **Save key**. The extension checks the key **directly with Google** (not through your moderation server).  
   - If the check fails, fix the key in AI Studio or try again later (quota/rate limits).  
   - If it succeeds, the key is stored in **`chrome.storage.local`** on this browser profile only.

5. **Turn on “Use my key for moderations”**  
   After a successful save, use **Turn on** in the status area, or enable **Use my key for moderations** in Options.  
   The side panel shows **Your key · On** when the key is saved and this toggle is on.

6. **Moderate as usual**  
   With **Your key · On**, each moderation uses your key over HTTPS. Usage counts against **your** Google project quota/billing, not the shared pool.

7. **Turn off or remove**  
   - **Your key · Off** in the side panel (or uncheck **Use my key**) — key stays saved but moderations use the shared pool again.  
   - **Remove key** in Options — deletes the key from this browser.

### Extension quick checks

| Goal | What to verify |
|------|----------------|
| Key saved | Options shows “A key is saved”; side panel can show **Your key · Off** or **On** |
| Key in use | Side panel **Your key · On**; moderation does not fail with missing-key errors |
| New key | Paste over the field and **Save key** again, or **Remove** then save |
| New browser / PC | Keys do **not** sync — repeat this part on each install |

---

**Note:** BYOK on the moderation **website** (Universal web app, Platform Intelligence) is a separate product UI and is **not** described in this guide.
