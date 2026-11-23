import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end specs for both apps (AGENTS.md, "E2E (Playwright) and CI"). No backend and no
 * database run: the shared fixture in e2e/fixtures answers every API and hub request and fails a
 * spec on an unanswered request, a request off localhost or a page error.
 *
 * Only behaviour specs run by default. Visual, responsive, accessibility and heap sweeps carry the
 * tag @sweep and run only when a person asks: CF_SWEEPS=1 npx playwright test --grep @sweep.
 */
const WEB_PORT = Number(process.env['CF_WEB_PORT'] ?? 4310);
const ADMIN_PORT = Number(process.env['CF_ADMIN_PORT'] ?? 4311);
// CI serves the build the previous step made; a person's run compiles with `ng serve`.
const builtApps = process.env['CF_SERVE_BUILT'] === '1';
const serve = (app: string, port: number) =>
  builtApps ? `node e2e/static-server.mjs ${app} ${port}` : `npx ng serve ${app} --port ${port}`;
const sweeps = process.env['CF_SWEEPS'] === '1';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  // The runner has four cores and the specs wait on the browser more than they compute.
  workers: process.env['CI'] ? 4 : undefined,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
  grepInvert: sweeps ? undefined : /@sweep/,
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
  },
  // Chromium only (AGENTS.md).
  projects: [
    {
      name: 'web',
      testDir: 'e2e/web',
      use: { browserName: 'chromium', baseURL: `http://localhost:${WEB_PORT}` },
    },
    {
      name: 'admin',
      testDir: 'e2e/admin',
      use: { browserName: 'chromium', baseURL: `http://localhost:${ADMIN_PORT}` },
    },
  ],
  webServer: [
    {
      command: serve('web', WEB_PORT),
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
    {
      command: serve('admin', ADMIN_PORT),
      url: `http://localhost:${ADMIN_PORT}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
