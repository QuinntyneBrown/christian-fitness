import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_URL, WEB_URL } from './shots';

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
  webServer: [
    {
      command: 'npx ng serve web --port 4310',
      cwd: frontend,
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: 240_000,
    },
    {
      command: 'npx ng serve admin --port 4311',
      cwd: frontend,
      url: ADMIN_URL,
      reuseExistingServer: true,
      timeout: 240_000,
    },
  ],
});
