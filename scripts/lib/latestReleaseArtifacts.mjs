import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const STABLE_ZIP_NAME = 'rag-moderation-assistant.zip';
export const DOWNLOAD_PATH = '/extension/downloads/rag-moderation-assistant.zip';

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * @param {string} extRoot
 */
export function resolveUniversalDir(extRoot) {
  return path.resolve(
    process.env.SYNC_UNIVERSAL_DIR ||
      path.join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
  );
}

/**
 * @param {string} zipPath
 */
export function sha256HexOfFile(zipPath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(zipPath));
  return hash.digest('hex');
}

/**
 * @param {string} manifestPath
 */
export function readVersionFromManifestFile(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = String(manifest?.version || '').trim();
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid manifest version at ${manifestPath}: ${version}`);
  }
  return version;
}

/**
 * @param {string} extRoot
 * @param {string} [storeOutDir]
 */
export function resolvePackagedVersion(extRoot, storeOutDir) {
  const envVersion = String(process.env.RELEASE_VERSION || '').trim();
  if (envVersion) {
    if (!SEMVER_PATTERN.test(envVersion)) {
      throw new Error(`RELEASE_VERSION must be semver X.Y.Z (got: ${envVersion})`);
    }
    return envVersion;
  }
  const storeManifest = path.join(storeOutDir || path.join(extRoot, 'dist', 'store'), 'manifest.json');
  if (fs.existsSync(storeManifest)) {
    return readVersionFromManifestFile(storeManifest);
  }
  return readVersionFromManifestFile(path.join(extRoot, 'packaging', 'manifest.store.json'));
}

/**
 * @param {import('fs').Stats} [stats]
 */
function formatBuiltAtIso(stats) {
  if (stats?.mtime) {
    return stats.mtime.toISOString();
  }
  return new Date().toISOString();
}

/**
 * @param {Record<string, unknown>} meta
 */
export function formatLatestReleaseMetadataForGuide(meta) {
  const version = String(meta.version ?? '');
  const builtAt = String(meta.builtAt ?? '');
  const sha256 = String(meta.sha256 ?? '');
  const downloadPath = String(meta.downloadPath ?? DOWNLOAD_PATH);
  const versionedName = meta.versionedZipFileName
    ? String(meta.versionedZipFileName)
    : `rag-moderation-assistant-${version}.zip`;

  return `## Current sideload build

| Field | Value |
|-------|-------|
| **Version** | ${version} |
| **Built** | ${builtAt} |
| **SHA256** | \`${sha256}\` |

**[Download latest build](${downloadPath})** (\`${STABLE_ZIP_NAME}\`)

Optional versioned copy on disk after packaging: \`${versionedName}\`.

Verify the file: \`sha256sum ${STABLE_ZIP_NAME}\` (Linux) or \`shasum -a 256 ${STABLE_ZIP_NAME}\` (macOS).

Unzip the download, then follow **[Install (developer / unpacked)](/extension/install-chrome-extension-developer)**.

Also on **[GitHub Releases — latest](https://github.com/tompearson/rag-moderation-extension/releases/latest)** (tagged CI assets).`;
}

/**
 * @param {{
 *   extRoot: string;
 *   zipPath?: string;
 *   universalDir?: string;
 *   skipUniversalCopy?: boolean;
 * }} options
 */
export function writeLatestReleaseArtifacts(options) {
  const extRoot = path.resolve(options.extRoot);
  const zipPath = path.resolve(options.zipPath || path.join(extRoot, 'dist', STABLE_ZIP_NAME));
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Missing ZIP: ${zipPath} — run package:store first`);
  }

  const universalDir = options.universalDir
    ? path.resolve(options.universalDir)
    : resolveUniversalDir(extRoot);
  const version = resolvePackagedVersion(extRoot);
  const zipStats = fs.statSync(zipPath);
  const sha256 = sha256HexOfFile(zipPath);
  const versionedZipFileName = `rag-moderation-assistant-${version}.zip`;

  const meta = {
    version,
    sha256,
    builtAt: formatBuiltAtIso(zipStats),
    zipFileName: STABLE_ZIP_NAME,
    downloadPath: DOWNLOAD_PATH,
    versionedZipFileName,
    note:
      'Unzip the download, then Load unpacked in chrome://extensions — see the developer install guide.',
  };

  const jsonPath = path.join(extRoot, 'docs', 'data', 'latest-release.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

  if (!options.skipUniversalCopy) {
    const downloadsDir = path.join(universalDir, 'public', 'extension', 'downloads');
    fs.mkdirSync(downloadsDir, { recursive: true });
    const stableDest = path.join(downloadsDir, STABLE_ZIP_NAME);
    const versionedDest = path.join(downloadsDir, versionedZipFileName);
    fs.copyFileSync(zipPath, stableDest);
    fs.copyFileSync(zipPath, versionedDest);
    console.log(`Copied ZIP → ${stableDest}`);
    console.log(`Copied ZIP → ${versionedDest}`);
  }

  console.log(`Wrote ${jsonPath}`);
  console.log(`Version ${version}  SHA256 ${sha256.slice(0, 16)}…`);
  return meta;
}
