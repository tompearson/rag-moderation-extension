# Install RAG Moderation Assistant extension in Google Chrome

**Start here.** Part 1 walks through **install and pin** from the **Chrome Web Store**. Part 2 points you to a **Gemini API key** (optional on shared capacity; **recommended** for regular moderating or your own Google quota).

Installing an **unpacked** build for development or QA? See **[Install (developer / unpacked build)](https://www.airesearchdog.net/extension/install-chrome-extension-developer)** — do not use Developer mode steps below for a normal Web Store install.

## On this page {#toc}

- [Part 1 — Install from the Chrome Web Store](#install)
- [Part 2 — Get a Gemini API key (recommended)](#gemini)
- [Related guides](#related)

---

## Part 1 — Install from the Chrome Web Store {#install}

1. **Open the store**  
   In Chrome, go to the [Chrome Web Store](https://chromewebstore.google.com/).

2. **Find the extension**  
   Use the search bar or browse categories to find **RAG Moderation Assistant** (or the name shown on the listing page).

3. **Verify the details**  
   Open the extension’s overview page. Check the developer name, user reviews, and requested permissions so you know the listing is authentic and appropriate for your use.

4. **Install**  
   Click **Add to Chrome** (blue button on the right side of the page).

5. **Confirm permissions**  
   Chrome shows a dialog listing what the extension can access. Review it and click **Add extension**.

6. **Pin the extension to the toolbar**

   1. In the upper-right area of Chrome (known as the extension toolbar), click on the **chicklet**.

      ![Extensions puzzle-piece icon in the Chrome toolbar](/extension/images/install-chrome-extensions-puzzle-chicklet.png)

   2. Find **RAG Moderation Assistant** and click the **thumbtack**.

      ![Pin (thumbtack) for RAG Moderation Assistant in the Extensions menu](/extension/images/install-chrome-extensions-pin-thumbtack.png)

      The thumbtack should have a slash through it and the extension may open in your current window. The extension should be visible in the extension toolbar.

      ![RAG Moderation Assistant icon pinned in the Chrome extension toolbar](/extension/images/install-chrome-toolbar-extension-icon.png)

---

## Part 2 — Get a Gemini API key (recommended) {#gemini}

The **final recommended step** after install and pinning is to obtain a **personal Gemini API key** and save it in the extension. With **Use my key for moderations** turned on, each moderation uses **your** Google project quota instead of the shared pool.

The extension includes a small number of **free moderations** on shared capacity, so a key is optional for very light use. For regular moderating, we recommend completing this step.

**[Get a Gemini API key for moderation](https://www.airesearchdog.net/extension/get-gemini-api-key)**

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts) | Side panel workflow after install |
| [Install (developer / unpacked)](https://www.airesearchdog.net/extension/install-chrome-extension-developer) | Load unpacked or test `dist/store/` |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Read before acting on moderation suggestions |

---

**Note:** **Microsoft Edge** can install the same package from the Edge Add-ons store when published there. Steps are similar; see your team’s Edge listing link when available.
