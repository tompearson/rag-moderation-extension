#!/usr/bin/env node
/**
 * Free TCP listen ports before starting local dev processes.
 */
import { spawnSync } from 'node:child_process';

/** @param {number} port */
export function pidsListeningOnPort(port) {
  const r = spawnSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  });
  if (r.error || r.status !== 0 || !r.stdout.trim()) return [];
  return [...new Set(r.stdout.trim().split('\n').map((s) => s.trim()).filter(Boolean))];
}

/**
 * @param {number} port
 * @param {{ verbose?: boolean }} [opts]
 */
export function freePort(port, opts = {}) {
  const { verbose = true } = opts;
  let pids = pidsListeningOnPort(port);
  if (!pids.length) return;

  if (verbose) {
    console.log(`Port ${port} in use (PID ${pids.join(', ')}) — stopping…`);
  }
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

/** @param {number[]} ports */
export function freePorts(ports, opts) {
  for (const port of ports) freePort(port, opts);
}
