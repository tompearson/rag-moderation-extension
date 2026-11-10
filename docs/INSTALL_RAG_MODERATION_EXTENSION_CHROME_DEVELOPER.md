# Install RAG Moderation Assistant (developer / unpacked build)

Look for **RAG Moderation Assistant** in the [Chrome Web Store listing](https://chromewebstore.google.com/). The installation information here is for testers.

## If you received a release email {#release-email}

You may get email from **info@airesearchdog.net** when a new **sideload** build is published. That message is for **this install path** — not the Chrome Web Store.

1. **Use the ZIP link in the email**, download from **[Get the latest extension](https://www.airesearchdog.net/extension/get-latest-extension)** on this site, or open [GitHub Releases — latest](https://github.com/tompearson/rag-moderation-extension/releases/latest) and under **Assets**, download `rag-moderation-assistant-<version>.zip`.
2. **Optional:** compare **SHA256** in the email with the file on your machine (`sha256sum` on Linux, `shasum -a 256` on macOS).
3. **Unzip** the download to a folder.
4. Chrome cannot install the `.zip` directly — continue below with **Part 1**, then choose that **unzipped folder** when you click **Load unpacked**.
5. After install, run **[How to test the extension](https://www.airesearchdog.net/extension/how-to-test-extension)** (QA), then use **[How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts)** for workflow.

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

5. **Load unpacked**  
   Click **Load unpacked** and select the extension folder: the **unzipped release ZIP** (see [If you received a release email](#release-email)), repo root for dev, or `dist/store/` after `npm run package:store`.

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
| [How to test the extension](https://www.airesearchdog.net/extension/how-to-test-extension) | Sideload QA after install |
| [How to moderate user posts](https://www.airesearchdog.net/extension/how-to-moderate-user-posts) | Side panel workflow |
| [Get a Gemini API key](https://www.airesearchdog.net/extension/get-gemini-api-key) | Optional BYOK after install |
| [Important — AI-generated analysis](https://www.airesearchdog.net/extension/important-ai-generated-analysis) | Read before acting on moderation suggestions |

---

**Note:** Store builds hide **Local dev** in Options; unpacked dev loads use the full repo manifest with optional localhost hosts.
