# Microsoft Edge porting notes

Same MV3 codebase as Chrome ([Port a Chrome extension to Microsoft Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)).

## Table of contents

- [Code](#code)
- [Test (cross-browser QA)](#test-cross-browser-qa)
- [Publish](#publish)

## Code

- Use `chrome.*` APIs (including `chrome.sidePanel`) — supported on Chromium Edge.
- Do **not** add `update_url` to `manifest.json` (Edge requirement).
- Avoid the word **Chrome** in Edge Add-ons listing name/description; use **Microsoft Edge** where needed.

## Test (cross-browser QA)

1. Open `edge://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this repo root (same folder as Chrome).
3. Pin the extension, open the **side panel**, complete location modal, run a moderate against local or production profile.
4. Repeat critical flows on Chrome (`chrome://extensions`) before release.

## Publish

- Package repo as `.zip` (manifest + assets at root; no `node_modules`).
- Upload to [Partner Center](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) (separate listing from Chrome Web Store).
- Storage is **per browser install** — `userLocation` on Edge does not sync to Chrome.
