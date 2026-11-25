import { test, expect } from '../fixtures/test';
import { answerHome } from '../fixtures/events';
import { WebHomePage } from '../page-objects/web/home.page';
import { LegalPage } from '../page-objects/web/legal.page';

test('A published revision is announced for 30 days with its summary on each document', async ({
  page,
  api,
}) => {
  await page.clock.setFixedTime('2026-05-02T00:00:00Z');
  await page.route(
    (url) => ['/home', '/privacy', '/terms'].includes(url.pathname),
    async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          '</head>',
          '<meta name="cf-privacy-change" content="2026-06-01" data-summary="Privacy fixture disclosure"><meta name="cf-terms-change" content="2026-06-01" data-summary="Terms fixture disclosure"></head>',
        ),
      });
    },
  );
  answerHome(api, { nextEvent: null, suggested: [] });
  const home = new WebHomePage(page);
  await home.open();
  await expect(home.changeBanner).toContainText(
    "We're updating our Privacy Policy and Terms on June 1, 2026.",
  );
  await home.changeLink.click();
  const legal = new LegalPage(page);
  await expect(legal.changeSummary).toContainText('Privacy fixture disclosure');
  await legal.open('/terms');
  await expect(legal.changeSummary).toContainText('Terms fixture disclosure');
  await legal.dismissChange.click();
  await expect(legal.changeBanner).toHaveCount(0);
  await page.clock.setFixedTime('2026-06-01T00:00:00Z');
  await legal.open('/terms');
  await expect(legal.heading).toHaveText('Terms of Service');
  await expect(legal.changeSummary).toHaveCount(0);
});
