# Install RAG Moderation Assistant (developer / unpacked build)

**Not for Chrome Web Store installs.** If you are installing from the [Chrome Web Store listing](https://chromewebstore.google.com/), use **[Install RAG Moderation Assistant in Google Chrome](https://www.airesearchdog.net/extension/install-chrome-extension)** instead.

This guide is for **developers and testers** loading an **unpacked** build from source (`Load unpacked` in Chrome) or validating a local store-shaped package (`dist/store/`).

## Part 1 — Enable an unpacked extension {#developer}

1. **Open the Chrome menu**  
   Click the **three vertical dots** in the top-right corner of the Chrome window.

2. **Open Extensions**  
   Hover **Extensions** in the dropdown list.

3. **Manage extensions**  
   Click **Manage Extensions** in the flyout.

4. **Turn on Developer mode**  
   On the extensions page, use the **Developer mode** slider in the upper-right and turn it **on**.

   ![Developer mode toggle turned on](/extension/images/install-chrome-developer-mode.png)

5. **Load unpacked (if needed)**  
   Click **Load unpacked** and select the extension folder (repo root for dev, or `dist/store/` after `npm run package:store`).

6. **Enable the extension on its card**

   1. Find **RAG Moderation Assistant** and make sure the **unlabeled slider** at the bottom-right of its card is **enabled** (on).

      ![RAG Moderation Assistant extension card with the enable slider turned on](/extension/images/install-chrome-extensions-card-enabled.png)

   2. In the upper-right area of Chrome (known as the extension toolbar), click on the **chicklet**.

      ![Extensions puzzle-piece icon in the Chrome toolbar](/extension/images/install-chrome-extensions-puzzle-chicklet.png)

      Find **RAG Moderation Assistant** and click the **thumbtack**.

      ![Pin (thumbtack) for RAG Moderation Assistant in the Extensions menu](/extension/images/install-chrome-extensions-pin-thumbtack.png)

      The thumbtack should have a slash through it and the extension may open in your current window. The extension should be visible in the extension toolbar.

      ![RAG Moderation Assistant icon pinned in the Chrome extension toolbar](/extension/images/install-chrome-toolbar-extension-icon.png)

---

## Related guides {#related}

| Guide | When to use it |
|------|----------------|
| [Install from Chrome Web Store](https://www.airesearchdog.net/extension/install-chrome-extension) | Normal moderator install |
| [Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key) | Optional BYOK after install |
| [Privacy policy](https://www.airesearchdog.net/extension/privacy) | Data use, BYOK, and contact |

---

**Note:** Store builds hide **Local dev** in Options; unpacked dev loads use the full repo manifest with optional localhost hosts.
