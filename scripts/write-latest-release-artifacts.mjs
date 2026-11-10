#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeLatestReleaseArtifacts } from './lib/latestReleaseArtifacts.mjs';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

writeLatestReleaseArtifacts({ extRoot });
