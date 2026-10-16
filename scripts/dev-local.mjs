#!/usr/bin/env node
/**
 * One command: API on PORT (default 3848) + Vite on 5173.
 * Usage: npm run dev:local
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  child.on('exit', (code) => {
    if (code && code !== 0) console.error(`[${label}] exited ${code}`);
  });
  return child;
}

const api = run('node', ['server.mjs'], 'api');
const vite = run('npx', ['vite'], 'vite');

function shutdown() {
  api.kill('SIGTERM');
  vite.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('\nHarbor local: UI http://localhost:5173 · API http://localhost:3848\n');
