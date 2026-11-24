import { expect, test } from '../fixtures/test';
import { answerService, answerServices, CAST, MARCUS } from '../fixtures/services';
import { WebServiceDetailPage } from '../page-objects/web/service-detail.page';
import { WebServicesPage } from '../page-objects/web/services.page';

// L2-013 AC4 (ADR 0051): below LG a chosen professional opens as its own screen with a back action.
test.describe('Member app, listing detail', () => {
  test('The listing screen shows name, role, where, about, credentials, rate and the verified line', async ({
    page,
    api,
  }) => {
    const asked = answerService(api, CAST);
    const detail = new WebServiceDetailPage(page);

    await detail.open(MARCUS.id);

    expect(await detail.view()).toEqual({
      name: 'Marcus Lee, RD',
      role: 'Registered dietitian',
      where: 'Virtual · Ontario-wide',
      about: MARCUS.about,
      facts: { Credentials: MARCUS.credentials, Rate: '$95 first consult' },
      verified: 'Verified by Christian Fitness, March 2026',
    });
    await expect(detail.backLink).toHaveAttribute('href', '/services');
    expect(await detail.title()).toBe('Professional · Christian Fitness');
    expect(asked).toEqual([MARCUS.id]);
  });

  test('Below LG choosing a professional opens their screen, and Back returns to the list in the same category', async ({
    page,
    api,
  }) => {
    answerServices(api, CAST);
    answerService(api, CAST);
    await page.setViewportSize({ width: 600, height: 900 });
    const services = new WebServicesPage(page);
    const detail = new WebServiceDetailPage(page);
    await services.open('?category=Nutrition');
    await expect(services.rows).toHaveCount(1);
    await expect(services.detail).toBeHidden();

    await services.rows.first().click();

    await expect(page).toHaveURL(`/services/${MARCUS.id}?category=Nutrition`);
    await expect(detail.card).toBeVisible();
    expect((await detail.view()).name).toBe('Marcus Lee, RD');
    await expect(detail.backLink).toHaveAttribute('href', '/services?category=Nutrition');

    await detail.backLink.click();

    await expect(page).toHaveURL('/services?category=Nutrition');
    await expect(services.rows).toHaveCount(1);
    await expect(services.filter('Nutrition')).toHaveAttribute('aria-current', 'page');
  });

  test('A listing that is not there shows the not-found screen', async ({ page, api }) => {
    answerService(api, []);
    const detail = new WebServiceDetailPage(page);

    await detail.open(MARCUS.id);

    await expect(detail.heading).toHaveText('Page not found');
    await expect(detail.code).toHaveText('404');
    await expect(detail.action('Browse services')).toHaveAttribute('href', '/services');
  });

  test('A failed request shows "This professional didn\'t load" and Try again asks again', async ({
    page,
    api,
  }) => {
    let failing = true;
    answerService(api, [MARCUS]);
    api.on('GET', /^\/api\/services\/[0-9a-f-]{36}$/, () =>
      failing ? { status: 400, json: { code: 'error' } } : { json: MARCUS },
    );
    const detail = new WebServiceDetailPage(page);

    await detail.open(MARCUS.id);
    await expect(detail.errorHeading).toBeVisible();
    failing = false;
    await detail.retryButton.click();

    await expect(detail.card).toBeVisible();
    await expect(detail.errorHeading).toBeHidden();
  });
});
