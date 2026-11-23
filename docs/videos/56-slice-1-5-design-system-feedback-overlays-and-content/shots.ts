import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { capture } from '../../../tools/video-record/shots';

/**
 * The captures of video 56: slice 1.5, design-system feedback, overlays and content. No screen
 * uses the new components yet (slice 1.6 moves the screens onto them), so the film draws them and
 * sets what the commands said word for word: the components library's own folders and exports,
 * its unit-test run, and both apps' initial totals from a production build. Taken by
 * `node tools/video-record/record.mjs docs/videos/56-slice-1-5-design-system-feedback-overlays-and-content --commands`.
 * Each answer is checked before it is saved to `shots/captures.js`. Not a test and not a sweep.
 */

const root = path.resolve(__dirname, '..', '..', '..');
const frontend = path.join(root, 'frontend');
const library = path.join(frontend, 'projects', 'components', 'src');

/** The design-system pages this slice builds, by their names in docs/design-system/components/. */
const BUILT = [
  'alert', 'banner', 'inline-message', 'toast', 'dialog', 'drawer', 'menu', 'empty-state',
  'skeleton', 'error-page', 'card', 'event-card', 'date-badge', 'description-list', 'list', 'stat',
  'table', 'pagination', 'accordion', 'tabs', 'message',
];

const run = (command: string): string => {
  const done = spawnSync(command, { cwd: frontend, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const said = `${done.stdout}${done.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
  if (done.status !== 0) throw new Error(`${command} failed:\n${said}`);
  return said;
};

/** "Initial total | 261.59 kB | 68.36 kB" from a production build's table. */
const initialTotal = (said: string): number => {
  const match = /Initial total\s*\|\s*([\d.]+) kB/.exec(said);
  if (!match) throw new Error(`no initial total in:\n${said}`);
  return Number(match[1]);
};

test('what the components library, its tests and the builds say', () => {
  test.setTimeout(900_000);

  const folders = readdirSync(library, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const pages = readdirSync(path.join(root, 'docs', 'design-system', 'components'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => name.replace(/\.html$/, ''));
  for (const name of BUILT) {
    expect(folders, `${name} built in the components library`).toContain(name);
    expect(pages, `${name} is a design-system page`).toContain(name);
  }
  const exports = readFileSync(path.join(library, 'public-api.ts'), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('export * from'));
  capture('library', { built: BUILT, exports: exports.length });

  const tests = run('npx ng test components --watch=false');
  const files = /Test Files\s+(\d+) passed \((\d+)\)/.exec(tests);
  const cases = /Tests\s+(\d+) passed \((\d+)\)/.exec(tests);
  expect(files, 'every test file passed').not.toBeNull();
  expect(cases, 'every test passed').not.toBeNull();
  capture('tests', {
    files: Number(files![1]),
    tests: Number(cases![1]),
    summary: tests
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^(Test Files|Tests)\s/.test(line)),
  });

  const web = initialTotal(run('npx ng build web'));
  const admin = initialTotal(run('npx ng build admin'));
  const budget = JSON.parse(readFileSync(path.join(frontend, 'angular.json'), 'utf8')) as {
    projects: Record<string, { architect: { build: { configurations: { production: { budgets: { type: string; maximumError?: string }[] } } } } }>;
  };
  const limit = (app: string) =>
    budget.projects[app].architect.build.configurations.production.budgets.find((b) => b.type === 'initial')!.maximumError;
  capture('bundles', { web, admin, webLimit: limit('web'), adminLimit: limit('admin') });
});
