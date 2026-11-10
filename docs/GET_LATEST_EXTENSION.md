# Get the latest extension (sideload ZIP)

This page lists the **current store-shaped sideload build** for **RAG Moderation Assistant**: version, build time, SHA256, and a **direct download** from this site.

Use it when you are testing an unpacked install in Chrome or Edge — not for the Chrome Web Store listing.

## On this page {#toc}

- [Current sideload build](#current-sideload-build) (version, SHA256, download — updated each `package:store`)
- [After you download](#after-you-download)
- [Related guides](#related)

<!-- LATEST_RELEASE_METADATA -->

## After you download {#after-you-download}

1. Unzip so the folder contains `manifest.json` at the top level.
2. Follow **[Install (developer / unpacked)](/extension/install-chrome-extension-developer)** (Developer mode, **Load unpacked**, pin the toolbar icon).
3. Run **[How to test the extension](/extension/how-to-test-extension)** before moderating real posts.

## Related guides {#related}

| Guide | Purpose |
|-------|---------|
| [Install (developer / unpacked)](/extension/install-chrome-extension-developer) | Load the unzipped folder |
| [How to test the extension](/extension/how-to-test-extension) | QA checklist |
| [How to moderate user posts](/extension/how-to-moderate-user-posts) | Day-to-day workflow |
| [Get a Gemini API key](/extension/get-gemini-api-key) | Optional BYOK (non-RAG provider) |
| [Important — AI-generated analysis](/extension/important-ai-generated-analysis) | Read before acting on moderation suggestions |

Maintainers: run `npm run package:store` in the extension repo (copies the ZIP here), then `npm run deploy:prod` in Moderation-Tool-Universal so production serves the fresh download. See [RELEASE.md](https://github.com/tompearson/rag-moderation-extension/blob/master/docs/RELEASE.md).
