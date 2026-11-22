import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_PORT, ADMIN_URL, API_URL, WEB_PORT, WEB_URL } from './shots';

/**
 * Saves the screenshots of a video (docs/videos/README.md, "Screenshots"). It is not a test run
 * and not a sweep: it borrows Playwright to open the running Angular apps and save pictures of
 * them. The video folder's `shots.ts` says which states to open, with the shared fixture and the
 * page objects of `frontend/e2e`, so every `/api/**` request is answered by a handler as in every
 * spec. Nothing here sets CF_SWEEPS, and neither `npm run e2e` nor CI reads this file. Run it
 * with `node tools/video-record/record.mjs <video folder>`.
 */
const folder = process.env['CF_VIDEO_DIR'];
if (!folder) throw new Error('Run this through tools/video-record/record.mjs <video folder>.');
const root = path.resolve(__dirname, '..', '..');
const frontend = path.resolve(root, 'frontend');
// `record.mjs --backend`: a slice with no screen films the running API instead of the apps.
const backend = process.env['CF_VIDEO_BACKEND'] === '1';
// `record.mjs --commands`: nothing runs; shots.ts captures what commands (git, gh) say.
const commands = process.env['CF_VIDEO_COMMANDS'] === '1';

export default defineConfig({
  testDir: path.resolve(root, folder),
  testMatch: 'shots.ts',
  outputDir: path.resolve(root, '.cache', 'video-record'),
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'off',
  },
  // Chromium only (AGENTS.md). Double density, the phone window, the light theme and no motion
  // are the defaults; `frame(page, 'XL', 'dark')` in shots.ts changes the window and the theme.
  // A shots.ts opens the admin app with `test.use({ baseURL: ADMIN_URL })`.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 780 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        contextOptions: { reducedMotion: 'reduce' },
      },
    },
  ],
  webServer: commands
    ? []
    : backend
    ? [
        {
          // The API as built, with no database: port 1 refuses at once, so readiness says so.
          command: 'dotnet run --project src/ChristianFitness.Api --no-launch-profile',
          cwd: path.resolve(root, 'backend'),
          url: `${API_URL}/health/live`,
          reuseExistingServer: false,
          timeout: 240_000,
          env: {
            ASPNETCORE_URLS: API_URL,
            ConnectionStrings__Default: 'Host=127.0.0.1;Port=1;Database=none;Timeout=2',
          },
        },
      ]
    : [
        {
          command: `npx ng serve web --port ${WEB_PORT}`,
          cwd: frontend,
          url: WEB_URL,
          reuseExistingServer: true,
          timeout: 240_000,
        },
        {
          command: `npx ng serve admin --port ${ADMIN_PORT}`,
          cwd: frontend,
          url: ADMIN_URL,
          reuseExistingServer: true,
          timeout: 240_000,
        },
      ],
});
