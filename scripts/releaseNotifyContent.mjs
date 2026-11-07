const INSTALL_DEV_URL =
  'https://www.airesearchdog.net/extension/install-chrome-extension-developer#release-email';
const HOW_TO_MODERATE_URL = 'https://www.airesearchdog.net/extension/how-to-moderate-user-posts';

/**
 * @param {{ repository: string; refName: string; zipSha: string }} params
 */
export function buildReleaseNotifyContent({ repository, refName, zipSha }) {
  const repo = String(repository || '').trim();
  const tag = String(refName || '').trim();
  const version = tag.replace(/^v/, '');
  const assetName = `rag-moderation-assistant-${version}.zip`;
  const assetUrl = `https://github.com/${repo}/releases/download/${tag}/${assetName}`;
  const releasesUrl = `https://github.com/${repo}/releases`;
  const latestUrl = `https://github.com/${repo}/releases/latest`;

  const subject = `RAG Moderation Assistant v${version} — sideload ZIP released`;

  const textBody = [
    `RAG Moderation Assistant v${version} (production sideload)`,
    '',
    'Download',
    `ZIP: ${assetUrl}`,
    `SHA256: ${zipSha}`,
    `Verify: sha256sum ${assetName} (Linux) or shasum -a 256 … (macOS)`,
    '',
    'Install',
    'Unzip the ZIP (manifest.json at the top level of the folder).',
    'chrome://extensions or edge://extensions → Developer mode → Load unpacked.',
    `Install guide: ${INSTALL_DEV_URL}`,
    `How to moderate: ${HOW_TO_MODERATE_URL}`,
    '',
    'Production API: https://www.airesearchdog.net',
    '',
    `All releases: ${releasesUrl}`,
    `Latest: ${latestUrl}`,
  ].join('\n');

  const htmlBody = `<div style="font-family:sans-serif;line-height:1.5;color:#1f2937;">
<p><strong>RAG Moderation Assistant v${escapeHtml(version)}</strong> (production sideload)</p>
<h3 style="margin:1.25em 0 0.5em;">Download</h3>
<ul>
<li><a href="${escapeHtml(assetUrl)}">${escapeHtml(assetName)}</a></li>
<li>SHA256: <code>${escapeHtml(zipSha)}</code></li>
<li>Verify: <code>sha256sum ${escapeHtml(assetName)}</code> (Linux) or <code>shasum -a 256 …</code> (macOS)</li>
</ul>
<h3 style="margin:1.25em 0 0.5em;">Install</h3>
<ol>
<li>Unzip the ZIP (<code>manifest.json</code> at the top level).</li>
<li><code>chrome://extensions</code> or <code>edge://extensions</code> → Developer mode → <strong>Load unpacked</strong>.</li>
<li><a href="${INSTALL_DEV_URL}">Install (developer / unpacked)</a></li>
<li><a href="${HOW_TO_MODERATE_URL}">How to moderate user posts</a></li>
</ol>
<p>Production API: <a href="https://www.airesearchdog.net">www.airesearchdog.net</a></p>
<p><a href="${escapeHtml(releasesUrl)}">All releases</a> · <a href="${escapeHtml(latestUrl)}">Latest</a></p>
</div>`;

  const markdownBody = `Production **sideload** build for RAG Moderation Assistant (**v${version}**).

### Download
- **ZIP:** [${assetName}](${assetUrl})
- **SHA256:** \`${zipSha}\`
- Verify: \`sha256sum ${assetName}\` (Linux) or \`shasum -a 256 …\` (macOS)

### Install (Chrome / Edge)
1. Download and **unzip** the ZIP (\`manifest.json\` must be at the **top level** of the folder).
2. Open \`chrome://extensions\` or \`edge://extensions\`, enable **Developer mode**, **Load unpacked**, select that folder.
3. **Install (developer / unpacked):** ${INSTALL_DEV_URL}
4. **How to moderate user posts:** ${HOW_TO_MODERATE_URL}

This build uses the **Production** API profile (\`https://www.airesearchdog.net\`) by default.

[All releases](${releasesUrl})
`;

  return {
    version,
    tag,
    assetName,
    assetUrl,
    subject,
    textBody,
    htmlBody,
    markdownBody,
  };
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
