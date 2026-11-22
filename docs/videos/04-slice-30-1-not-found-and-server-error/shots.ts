import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { AdminNotFoundPage } from '../../../frontend/e2e/page-objects/admin/not-found.page';
import { AdminServerErrorPage } from '../../../frontend/e2e/page-objects/admin/server-error.page';
import { WebNotFoundPage } from '../../../frontend/e2e/page-objects/web/not-found.page';
import { WebServerErrorPage } from '../../../frontend/e2e/page-objects/web/server-error.page';
import {
  ADMIN_URL,
  capture,
  detail,
  frame,
  shot,
  type Size,
  type Theme,
} from '../../../tools/video-record/shots';

/**
 * The screenshots of video 04: slice 30.1, Not found and server error, in the running apps. Each
 * screen is opened through its page object with the shared fixture, which answers every /api
 * request and fails the take on a page error or a request off localhost, as in every spec; no
 * backend and no database ran. The server-error screen is opened the way the interceptor opens
 * it: `/server-error` with the reference and the URL that failed. What each screen says is checked
 * before it is saved. The test counts are what the test runners printed, captured with
 * `capture()`. Not a test and not a sweep: only
 * `node tools/video-record/record.mjs docs/videos/04-slice-30-1-not-found-and-server-error` runs it.
 */

const takes: [Size, Theme][] = [
  ['XS', 'light'],
  ['XL', 'light'],
  ['XL', 'dark'],
];
const name = (app: string, screen: string, size: Size, theme: Theme) =>
  `${app}-${screen}-${size.toLowerCase()}-${theme}`;

test('member app', async ({ page }) => {
  const notFound = new WebNotFoundPage(page);
  const serverError = new WebServerErrorPage(page);
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await notFound.open('/events/old-spring-run');
    await expect(notFound.heading).toBeFocused();
    await expect(notFound.actions).toHaveText(['Go to home', 'Browse events']);
    await shot(page, name('web', 'not-found', size, theme));

    await serverError.open({ reference: 'CF-4BF92F35', from: '/events/42' });
    await expect(serverError.heading).toBeFocused();
    await expect(serverError.text).toContainText('quote reference CF-4BF92F35.');
    await shot(page, name('web', 'server-error', size, theme));
  }

  await frame(page, 'XL', 'light');
  await notFound.open('/events/old-spring-run');
  await expect(notFound.heading).toBeFocused();
  await detail(notFound.actionBar, 'web-not-found-actions', 6);

  await serverError.open({ reference: 'CF-4BF92F35', from: '/events/42' });
  await expect(serverError.heading).toBeFocused();
  await detail(serverError.text, 'web-server-error-reference', 6);

  // A crafted link: words of its own as the reference, and another site to "try again" on.
  await serverError.open({ reference: '<b>CF-1</b> call 555-0100', from: '//elsewhere.example/' });
  await expect(serverError.heading).toBeFocused();
  await expect(serverError.text).not.toContainText('reference');
  await expect(serverError.action('Try again')).toHaveAttribute('href', '/');
  await shot(page, 'web-server-error-crafted-xl-light');
});

test.describe('admin app', () => {
  test.use({ baseURL: ADMIN_URL });

  test('admin app', async ({ page }) => {
    const notFound = new AdminNotFoundPage(page);
    const serverError = new AdminServerErrorPage(page);
    for (const [size, theme] of takes) {
      await frame(page, size, theme);
      await notFound.open('/members/no-such-member');
      await expect(notFound.heading).toBeFocused();
      await expect(notFound.actions).toHaveText(['Go to dashboard', 'Manage events']);
      await shot(page, name('admin', 'not-found', size, theme));

      await serverError.open({ reference: 'CF-4BF92F35', from: '/members' });
      await expect(serverError.heading).toBeFocused();
      await shot(page, name('admin', 'server-error', size, theme));
    }
  });
});

test('what the test runners say', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const run = (command: string, cwd: string) => {
    const result = spawnSync(command, { cwd, encoding: 'utf8', shell: true });
    // eslint-disable-next-line no-control-regex
    return `${result.stdout}${result.stderr}`.replace(/\u001b\[[0-9;]*m/g, '');
  };

  const unit = run('npm test', path.join(root, 'frontend'));
  const unitCount = /Tests\s+(\d+) passed \((\d+)\)/.exec(unit);
  expect(unitCount, unit).not.toBeNull();
  capture('unit', { command: 'npm test', passed: Number(unitCount![1]), total: Number(unitCount![2]) });

  const specs = run('npx playwright test --list', path.join(root, 'frontend'));
  const specCount = /Total: (\d+) tests? in (\d+) files?/.exec(specs);
  expect(specCount, specs).not.toBeNull();
  capture('specs', {
    command: 'npx playwright test --list',
    tests: Number(specCount![1]),
    files: Number(specCount![2]),
    names: specs
      .split('\n')
      .filter((line) => /(not-found|server-error)\.spec\.ts/.test(line))
      .map((line) => line.replace(/^.*›\s*/, '').trim()),
  });

  const api = run(
    'dotnet test --filter "FullyQualifiedName~ProblemDetailsTests" --logger "console;verbosity=normal"',
    path.join(root, 'backend'),
  );
  const apiCount = /Total tests: (\d+)\s+Passed: (\d+)/.exec(api);
  expect(apiCount, api).not.toBeNull();
  capture('api', {
    command: 'dotnet test --filter ProblemDetailsTests',
    total: Number(apiCount![1]),
    passed: Number(apiCount![2]),
    names: [...api.matchAll(/Passed (ChristianFitness\.Api\.Tests\.Errors\.ProblemDetailsTests\.(\S+))/g)].map(
      (m) => m[2].replaceAll('_', ' '),
    ),
  });
});
