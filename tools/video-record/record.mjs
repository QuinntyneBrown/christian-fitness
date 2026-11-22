#!/usr/bin/env node
// Save the screenshots of a video: run <folder>/shots.ts in Chromium against the running app.
//
//   node tools/video-record/record.mjs docs/videos/NN-slice-S-S-topic
//
// Not a test and not a sweep (docs/videos/README.md): it compares nothing. The apps on :4310 (web)
// and :4311 (admin) are reused when they are running and started otherwise; every /api request is
// answered by the handlers of the e2e fixture, as in every spec.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const folder = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !fs.existsSync(path.join(folder, 'shots.ts'))) {
  console.error('usage: node tools/video-record/record.mjs <video folder with a shots.ts>');
  process.exit(2);
}
const modules = path.join(root, 'frontend', 'node_modules');
const env = { ...process.env, CF_VIDEO_DIR: folder, NODE_PATH: modules };
// The sweeps are run on request by a person; this tool is not one.
delete env['CF_SWEEPS'];

const run = spawnSync(
  process.execPath,
  [path.join(modules, '@playwright', 'test', 'cli.js'), 'test', '-c', path.join(root, 'tools', 'video-record', 'playwright.config.ts'), '--trace', 'off'],
  { cwd: root, env, stdio: 'inherit' },
);
if (run.status === 0) {
  const shots = path.join(folder, 'shots');
  const saved = fs.existsSync(shots) ? fs.readdirSync(shots).filter((f) => f.endsWith('.png')) : [];
  console.log(`${saved.length} PNG in ${shots}`);
}
process.exit(run.status ?? 1);
