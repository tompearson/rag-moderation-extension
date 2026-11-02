#!/usr/bin/env node
/**
 * Start local stack from rag-moderation-extension (RAG uvicorn + Universal dev server).
 *
 * Override sibling repo paths:
 *   DEV_RAG_DIR=/path/to/first-rag-system
 *   DEV_UNIVERSAL_DIR=/path/to/Moderation-Tool-Universal
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ragDir = resolve(
  process.env.DEV_RAG_DIR || join(extRoot, '..', 'first-rag-system'),
);
const universalDir = resolve(
  process.env.DEV_UNIVERSAL_DIR ||
    join(extRoot, '..', 'community-moderation-tool', 'Moderation-Tool-Universal'),
);

const mode = process.argv[2] || 'server';
if (mode !== 'server' && mode !== 'full') {
  console.error('Usage: node scripts/dev-services.mjs [server|full]');
  process.exit(1);
}

function requireDir(path, label) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}: ${path}`);
    console.error('Set DEV_RAG_DIR / DEV_UNIVERSAL_DIR if your checkout is elsewhere.');
    process.exit(1);
  }
}

requireDir(ragDir, 'first-rag-system');
requireDir(universalDir, 'Moderation-Tool-Universal');

const uvicorn = join(ragDir, '.venv', 'bin', 'uvicorn');
if (!existsSync(uvicorn)) {
  console.error(`No uvicorn in ${ragDir}/.venv — create venv and install deps first.`);
  process.exit(1);
}

const DEV_PORTS = [8000, 3001];
if (mode === 'full') DEV_PORTS.push(5173);

/** @param {number} port */
function pidsListeningOnPort(port) {
  const r = spawnSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });
  if (r.error || r.status !== 0 || !r.stdout.trim()) return [];
  return [...new Set(r.stdout.trim().split('\n').map((s) => s.trim()).filter(Boolean))];
}

/** @param {number} port */
function freePort(port) {
  let pids = pidsListeningOnPort(port);
  if (!pids.length) return;

  console.log(`Port ${port} in use (PID ${pids.join(', ')}) — stopping…`);
  for (const pid of pids) {
    const n = Number(pid);
    if (n === process.pid) continue;
    try {
      process.kill(n, 'SIGTERM');
    } catch {
      /* already gone */
    }
  }

  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const waitUntil = Date.now() + 200;
    while (Date.now() < waitUntil) {
      /* brief pause for SIGTERM */
    }
    pids = pidsListeningOnPort(port);
    if (!pids.length) return;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

function freeDevPorts() {
  for (const port of DEV_PORTS) freePort(port);
}

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function run(label, cwd, command, args) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[${label}] exited (${signal})`);
    } else if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
    }
    shutdown(code ?? 1);
  });
  children.push(child);
  return child;
}

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 300);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

console.log(`RAG API:     ${ragDir} → http://127.0.0.1:8000`);
console.log(`Universal:   ${universalDir} → http://127.0.0.1:3001`);
if (mode === 'full') {
  console.log('Vite UI:     http://localhost:5173 (Universal npm run dev)');
}
console.log('Extension:   Options → Local dev, then Load unpacked from this repo.\n');

freeDevPorts();

run('rag', ragDir, uvicorn, ['rag_api:app', '--host', '127.0.0.1', '--port', '8000']);

const universalScript = mode === 'full' ? 'dev:full' : 'dev:server';
run('universal', universalDir, 'npm', ['run', universalScript]);
