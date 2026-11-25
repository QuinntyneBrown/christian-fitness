import { expect, test } from '../fixtures/test';
import { LegalPage } from '../page-objects/web/legal.page';

// L2-038, L2-067. Run on request with CF_SWEEPS=1 and --grep @sweep.
test.describe('Legal pages', { tag: '@sweep' }, () => {
  for (const document of ['privacy', 'terms']) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(document + ' in ' + colorScheme + ' at XS to XL', async ({ page }, info) => {
        const legal = new LegalPage(page);
        await page.emulateMedia({ colorScheme });
        for (const width of [360, 640, 768, 1024, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await legal.open('/' + document);
          await expect(legal.heading).toBeVisible();
          await expect(legal.contents).toBeVisible({ visible: width >= 1024 });
          await expect(legal.sections).toHaveCount(9);
          expect(await legal.hasHorizontalOverflow()).toBe(false);
          await info.attach(document + '-' + colorScheme + '-' + width, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          });
        }
      });
    }
  }

  test('repeated visits release document views', async ({ page }) => {
    const legal = new LegalPage(page);
    const cdp = await page.context().newCDPSession(page);
    try {
      const measure = async () => {
        for (let visit = 0; visit < 5; visit++) {
          for (const path of ['/privacy', '/terms']) {
            await legal.open(path);
            await expect(legal.heading).toBeVisible();
          }
        }
        await cdp.send('HeapProfiler.collectGarbage');
        return (await cdp.send('Runtime.getHeapUsage')).usedSize;
      };
      const warmed = await measure();
      expect(await measure()).toBeLessThan(warmed + 2 * 1024 * 1024);
    } finally {
      await cdp.detach();
    }
  });
});
