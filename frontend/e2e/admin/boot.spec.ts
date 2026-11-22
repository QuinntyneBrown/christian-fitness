import { expect, test } from '../fixtures/test';
import { AdminStartPage } from '../page-objects/admin/start.page';

// L2-038 AC6: the document title names the app and the content sits in one main landmark.
// The shared fixture fails the spec on a page error or an unanswered request.
test.describe('Admin app', () => {
  test('boots with the title "Christian Fitness Admin" and one main landmark', async ({ page }) => {
    const start = new AdminStartPage(page);

    await start.open();

    await expect.poll(() => start.title()).toBe('Christian Fitness Admin');
    await expect(start.main).toHaveCount(1);
  });
});
