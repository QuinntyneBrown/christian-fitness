import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { AdminStartPage } from '../../../frontend/e2e/page-objects/admin/start.page';
import { WebStartPage } from '../../../frontend/e2e/page-objects/web/start.page';
import { ADMIN_URL, frame, shot, type Size, type Theme } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 01: slice 1.1, Frontend workspace, in the running apps. Each app is
 * opened through its page object with the shared fixture, which answers every /api request and
 * fails the take on a page error or a request off localhost, as in every spec; no backend and no
 * database ran. The title each app shows is checked before its shots are saved. Not a test and
 * not a sweep: only `node tools/video-record/record.mjs docs/videos/01-slice-1-1-frontend-workspace`
 * runs it.
 */

const takes: [Size, Theme][] = [
  ['XS', 'light'],
  ['XL', 'light'],
  ['XL', 'dark'],
];

test('member app', async ({ page }) => {
  const start = new WebStartPage(page);
  for (const [size, theme] of takes) {
    await frame(page, size, theme);
    await start.open();
    await expect.poll(() => start.title()).toBe('Christian Fitness');
    await expect(start.main).toHaveCount(1);
    await shot(page, `web-${size.toLowerCase()}-${theme}`);
  }
});

test.describe('admin app', () => {
  test.use({ baseURL: ADMIN_URL });

  test('admin app', async ({ page }) => {
    const start = new AdminStartPage(page);
    for (const [size, theme] of takes) {
      await frame(page, size, theme);
      await start.open();
      await expect.poll(() => start.title()).toBe('Christian Fitness Admin');
      await expect(start.main).toHaveCount(1);
      await shot(page, `admin-${size.toLowerCase()}-${theme}`);
    }
  });
});
