import { expect, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';

// L2-038 AC6: the document title names the screen and the app, and the content sits in one main
// landmark. Signed-in staff land on the Dashboard (ADR 0011). The shared fixture fails the spec on
// a page error or an unanswered request.
test.describe('Admin app', () => {
  test('boots on the Dashboard with its title and one main landmark', async ({ page }) => {
    const shell = new AdminShell(page);

    await shell.open();

    await expect.poll(() => shell.title()).toBe('Dashboard · Christian Fitness Admin');
    await expect(shell.main).toHaveCount(1);
  });
});
