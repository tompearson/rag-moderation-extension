import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Chrome Web Store requires `manifest.json` at the archive root (not `./manifest.json`).
 * Windows bsdtar ZIPs use a `./` prefix and fail dashboard upload.
 */
export function assertZipHasRootManifest(zipPath) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Missing ZIP: ${zipPath}`);
  }

  if (process.platform === 'win32') {
    const q = (s) => s.replace(/'/g, "''");
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        [
          'Add-Type -AssemblyName System.IO.Compression.FileSystem',
          `$z=[System.IO.Compression.ZipFile]::OpenRead('${q(zipPath)}')`,
          'try {',
          "$ok = @($z.Entries | Where-Object { $_.FullName -eq 'manifest.json' }).Count -gt 0",
          "if (-not $ok) { throw 'ZIP must contain manifest.json at archive root (Chrome rejects ./manifest.json from bsdtar).' }",
          '} finally { $z.Dispose() }',
        ].join('; '),
      ],
      { stdio: 'pipe' },
    );
    return;
  }

  let listing = '';
  try {
    listing = execFileSync('unzip', ['-l', zipPath], { encoding: 'utf8' });
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return;
    }
    throw err;
  }
  if (!/(^|\s)\d+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+manifest\.json$/m.test(listing)) {
    throw new Error(
      'ZIP must contain manifest.json at archive root for Chrome Web Store upload.',
    );
  }
}

/**
 * @param {string} outDir
 * @param {string} zipPath
 */
export function writeStoreZip(outDir, zipPath) {
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  try {
    execFileSync('zip', ['-r', zipPath, '.'], {
      cwd: outDir,
      stdio: 'inherit',
    });
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      throw err;
    }
    if (process.platform === 'win32') {
      const q = (s) => s.replace(/'/g, "''");
      execFileSync(
        'powershell',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          `Compress-Archive -Path '${q(path.join(outDir, '*'))}' -DestinationPath '${q(zipPath)}' -CompressionLevel Optimal`,
        ],
        { stdio: 'inherit' },
      );
    } else {
      execFileSync('tar', ['-a', '-c', '-f', zipPath, '-C', outDir, '.'], {
        stdio: 'inherit',
      });
    }
  }
  assertZipHasRootManifest(zipPath);
}