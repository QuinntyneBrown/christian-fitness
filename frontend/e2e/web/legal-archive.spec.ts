import { expect, test } from '../fixtures/test';
import { LegalPage } from '../page-objects/web/legal.page';

// L2-067 AC6. A dated link remains readable independently of the application.
test.use({ javaScriptEnabled: false });
for (const [document, title] of [
  ['privacy', 'Privacy Policy'],
  ['terms', 'Terms of Service'],
]) {
  test('Read the dated ' + title + ' without JavaScript', async ({ page }) => {
    const legal = new LegalPage(page);
    await legal.open('/' + document + '/2026-04-01');
    await expect(legal.heading).toHaveText(title);
    await expect(legal.effective).toContainText('April 1, 2026');
    await expect(legal.sections).toHaveCount(9);
    await expect(legal.currentVersion).toHaveAttribute('href', '/' + document);
  });
}
