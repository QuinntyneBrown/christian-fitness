import { expect, test } from '../fixtures/test';
import { WebStartPage } from '../page-objects/web/start.page';

// L2-038 AC6: the document title names the app and the content sits in one main landmark.
// The shared fixture fails the spec on a page error or an unanswered request.
test.describe('Member app', () => {
  test('boots with the title "Christian Fitness" and one main landmark', async ({ page, api }) => {
    api.on('GET', '/api/session', () => ({
      status: 401,
      json: { status: 401, code: 'unauthenticated' },
    }));
    const start = new WebStartPage(page);

    await start.open();

    await expect.poll(() => start.title()).toBe('Christian Fitness');
    await expect(start.main).toHaveCount(1);
  });
});
