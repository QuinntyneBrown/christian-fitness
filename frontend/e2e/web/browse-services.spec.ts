import { expect, test } from '../fixtures/test';
import { answerServices, CAST, JAMES, MARCUS } from '../fixtures/services';
import { WebServicesPage } from '../page-objects/web/services.page';

// L2-013 AC1 to AC3 (ADR 0000): browse the professionals the team has listed, filter by category,
// and read the selected one's card beside the list (mock `services/default`, `selected`, `filtered`).
test.describe('Member app, browse professionals', () => {
  test('Services lists each professional with name, role, where and price, the first selected with its card', async ({
    page,
    api,
  }) => {
    answerServices(api, CAST);
    const services = new WebServicesPage(page);

    await services.open();

    await expect(services.heading).toHaveText('Services');
    await expect(services.rows).toHaveCount(5);
    expect(await services.rowViews()).toEqual([
      {
        href: `/services?selected=${CAST[0].id}`,
        name: 'Danielle Okafor',
        text: 'Personal trainer · In person · East York',
        price: 'From $70 / session',
        current: true,
      },
      expect.objectContaining({
        name: 'Marcus Lee, RD',
        text: 'Registered dietitian · Virtual · Ontario-wide',
        price: '$95 first consult',
        current: false,
      }),
      expect.objectContaining({ name: 'Rev. James Whitfield', current: false }),
      expect.objectContaining({ name: 'Ruth Abernathy', current: false }),
      expect.objectContaining({ name: 'Tasha Grant', current: false }),
    ]);
    await expect(services.currentRow).toHaveCount(1);
    expect(await services.detailView()).toEqual({
      name: 'Danielle Okafor',
      role: 'Personal trainer',
      where: 'In person · East York',
      about: 'Strength training for busy parents.',
      facts: { Credentials: 'NSCA-CPT, 8 years coaching', Rate: 'From $70 / session' },
      verified: 'Verified by Christian Fitness, February 2026',
    });
    await expect(services.filter('All')).toHaveAttribute('aria-current', 'page');
    await expect(services.applyButton).toBeVisible();
  });

  test('Choosing a professional shows their card and marks the row, without reloading', async ({
    page,
    api,
  }) => {
    answerServices(api, CAST);
    const services = new WebServicesPage(page);
    await services.open();
    await expect(services.rows).toHaveCount(5);
    await page.evaluate(() => {
      (window as unknown as { __cfSpaMark?: string }).__cfSpaMark = 'kept';
    });

    await services.rows.nth(1).click();

    await expect(page).toHaveURL(`/services?selected=${MARCUS.id}`);
    await expect(services.currentRow).toHaveCount(1);
    await expect(services.currentRow).toContainText('Marcus Lee, RD');
    expect(await services.detailView()).toEqual({
      name: 'Marcus Lee, RD',
      role: 'Registered dietitian',
      where: 'Virtual · Ontario-wide',
      about: MARCUS.about,
      facts: { Credentials: MARCUS.credentials, Rate: '$95 first consult' },
      verified: 'Verified by Christian Fitness, March 2026',
    });
    expect(
      await page.evaluate(() => (window as unknown as { __cfSpaMark?: string }).__cfSpaMark),
    ).toBe('kept');
  });

  test('An address that names a professional opens with their card, and an unknown one falls back to the first', async ({
    page,
    api,
  }) => {
    answerServices(api, CAST);
    const services = new WebServicesPage(page);

    await services.open(`?selected=${JAMES.id}`);
    await expect(services.currentRow).toContainText('Rev. James Whitfield');
    expect((await services.detailView()).name).toBe('Rev. James Whitfield');

    await services.open('?selected=not-a-listing');
    await expect(services.currentRow).toContainText('Danielle Okafor');
  });

  test('Choosing a category shows only its professionals with its chip current, and All shows every one', async ({
    page,
    api,
  }) => {
    const asked = answerServices(api, CAST);
    const services = new WebServicesPage(page);
    await services.open();
    await expect(services.rows).toHaveCount(5);

    await services.filter('Nutrition').focus();
    await services.filter('Nutrition').press('Enter');

    await expect(page).toHaveURL('/services?category=Nutrition');
    await expect(services.rows).toHaveCount(1);
    await expect(services.currentRow).toContainText('Marcus Lee, RD');
    expect((await services.detailView()).name).toBe('Marcus Lee, RD');
    await expect(services.filter('Nutrition')).toHaveAttribute('aria-current', 'page');
    await expect(services.filter('All')).not.toHaveAttribute('aria-current', 'page');

    await services.filter('All').click();
    await expect(page).toHaveURL('/services');
    await expect(services.rows).toHaveCount(5);
    expect(asked.categories).toEqual([null, 'Nutrition', null]);
  });

  test('An address with a category opens filtered, and one the app does not know shows everyone', async ({
    page,
    api,
  }) => {
    const asked = answerServices(api, CAST);
    const services = new WebServicesPage(page);

    await services.open('?category=Counselling');
    await expect(services.rows).toHaveCount(1);
    await expect(services.filter('Counselling')).toHaveAttribute('aria-current', 'page');

    await services.open('?category=yoga');
    await expect(services.rows).toHaveCount(5);
    await expect(services.filter('All')).toHaveAttribute('aria-current', 'page');
    expect(asked.categories).toEqual(['Counselling', null]);
  });

  test('A category with no professionals says so and Clear filter shows everyone', async ({
    page,
    api,
  }) => {
    answerServices(api, [MARCUS]);
    const services = new WebServicesPage(page);
    await services.open();
    await expect(services.rows).toHaveCount(1);

    await services.filter('Physio').click();

    await expect(services.noResults).toBeVisible();
    await expect(services.noResultsText).toHaveText(
      'No Physio professionals right now. New ones are listed as the team approves them.',
    );
    await services.clearFilter.click();
    await expect(services.rows).toHaveCount(1);
    await expect(page).toHaveURL('/services');
  });

  test('Names and words are shown as text, never as markup', async ({ page, api }) => {
    answerServices(api, [
      { ...MARCUS, name: '<b>Marcus</b> Lee', about: '<img src=x onerror=alert(1)> Meal plans' },
    ]);
    const services = new WebServicesPage(page);

    await services.open();

    await expect(services.rows).toHaveCount(1);
    expect((await services.rowViews())[0].name).toBe('<b>Marcus</b> Lee');
    expect((await services.detailView()).about).toBe('<img src=x onerror=alert(1)> Meal plans');
    await expect(services.main.locator('b, img[src="x"]')).toHaveCount(0);
  });

  test('The header and the bottom bar list Services, with it current', async ({ page, api }) => {
    answerServices(api, CAST);
    const services = new WebServicesPage(page);

    await services.open();
    await expect(services.rows).toHaveCount(5);
    await expect(services.navLinks).toHaveText(['Home', 'Events', 'Services', 'Messages']);
    await expect(services.currentNavLink).toHaveText('Services');

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(services.mobileItems).toHaveText([
      'Home',
      'Events',
      'Services',
      'Messages',
      'Profile',
    ]);
    await expect(services.mobileCurrentItem).toHaveText('Services');
  });

  // Loading, empty and error states (mock `services/loading`, `empty`, `error`).
  test('While the professionals load it shows skeleton rows named for assistive technology', async ({
    page,
    api,
  }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/services', async () => {
      await held;
      return { json: { total: 1, services: [MARCUS] } };
    });
    const services = new WebServicesPage(page);

    await services.open();

    await expect(services.loading).toHaveAttribute('aria-busy', 'true');
    await expect(services.loadingLabel).toBeAttached();
    await expect(services.skeletonRows.first()).toBeVisible();
    release();
    await expect(services.rows).toHaveCount(1);
    await expect(services.loading).toHaveCount(0);
  });

  test('With nobody listed it says so and points to events', async ({ page, api }) => {
    answerServices(api, []);
    const services = new WebServicesPage(page);

    await services.open();

    await expect(services.emptyHeading).toBeVisible();
    await expect(services.browseEventsLink).toHaveAttribute('href', '/events');
    await expect(services.rows).toHaveCount(0);
    await expect(services.applyButton).toBeVisible();
  });

  test('When the professionals cannot be reached it offers Try again, which asks again', async ({
    page,
    api,
  }) => {
    const asked = answerServices(api, [MARCUS], (n) => (n === 0 ? { abort: true } : null));
    const services = new WebServicesPage(page);

    await services.open();
    await expect(services.errorHeading).toBeVisible();
    await services.retryButton.click();

    await expect(services.rows).toHaveCount(1);
    await expect(services.errorHeading).toBeHidden();
    expect(asked.categories).toEqual([null, null]);
  });
});
