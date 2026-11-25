import { test, expect } from '../fixtures/test';
import { LegalPage } from '../page-objects/web/legal.page';

for (const path of ['/privacy', '/terms']) {
  test(path + ' contents links reach unobscured sections by keyboard at LG', async ({ page }) => {
    const legal = new LegalPage(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await legal.open(path);
    await expect(legal.contents).toBeVisible();
    const links = legal.contents.getByRole('link');
    await expect(links).toHaveCount(9);
    for (let index = 0; index < 9; index++) {
      const link = legal.contentsLink(index);
      const destination = await link.getAttribute('href');
      expect(destination).toMatch(new RegExp('^' + path + '#'));
      await link.focus();
      await link.press('Enter');
      await expect(page).toHaveURL(new URL(destination!, page.url()).href);
      await expect.poll(() => legal.headingTop(index)).toBeLessThan(800);
      expect(await legal.headingTop(index)).toBeGreaterThanOrEqual(await legal.headerBottom());
      await expect(legal.contents).toBeInViewport();
    }
    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(legal.contents).toBeHidden();
  });
}
