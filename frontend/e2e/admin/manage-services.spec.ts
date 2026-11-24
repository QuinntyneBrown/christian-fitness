import {
  applicationQueue,
  APPLICATIONS_NOW,
  CAST_APPLICATIONS,
} from '../fixtures/admin-applications';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { ManageServicesPage } from '../page-objects/admin/manage-services.page';

const PATH = '/api/admin/services/applications';

// L2-025 AC1 and AC4 (slice 21.1; ADR 0000): the Services page shows the application queue.
test.describe('Admin app, the application queue', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-services/default.
  test('lists each pending application with name, time, role and credentials, oldest first', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(APPLICATIONS_NOW);
    api.on('GET', PATH, () => applicationQueue(CAST_APPLICATIONS));
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.heading).toHaveText('Services');
    await expect.poll(() => services.title()).toBe('Services · Christian Fitness Admin');
    await expect(services.subtitle).toHaveText(
      'Every professional is checked before members can see them.',
    );
    await expect(services.applicationsCount).toHaveText('3');
    await expect(services.applications).toHaveCount(3);
    expect(await services.applicationTexts()).toEqual([
      ['Lena Park, RD', '5 days ago', 'Sports dietitian', 'Registered Dietitian, CDO'],
      ['Samuel Osei', '3 days ago', 'Strength coach', 'CSCS · 6 years'],
      ['Hannah Bergstrom', '2 days ago', 'Registered massage therapist', 'RMT, CMTO #T4471'],
    ]);
    await expect(services.empty).toHaveCount(0);
  });

  test('shows names and credentials as text, never as HTML, and the count of all waiting', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(APPLICATIONS_NOW);
    api.on('GET', PATH, () =>
      applicationQueue(
        [{ ...CAST_APPLICATIONS[0], name: '<b>Lena</b> Park', credentials: '<i>RD</i>' }],
        57,
      ),
    );
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.applicationsCount).toHaveText('57');
    expect((await services.applicationTexts())[0]).toEqual([
      '<b>Lena</b> Park',
      '5 days ago',
      'Sports dietitian',
      '<i>RD</i>',
    ]);
  });

  // Mock admin-services/no-applications; the fixture's default answer is an empty queue.
  test('with nothing to review, says there are no applications waiting', async ({ page }) => {
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.empty).toHaveText(
      'No applications waiting. New ones show up here and on the dashboard.',
    );
    await expect(services.applications).toHaveCount(0);
    await expect(services.applicationsCount).toHaveCount(0);
  });

  // Mock admin-services/loading: a gate holds the answer, so no clock is needed.
  test('while the queue loads, skeleton cards are busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', PATH, async () => {
      await gate;
      return applicationQueue(CAST_APPLICATIONS);
    });
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.loading).toBeVisible();
    await expect(services.skeletons.first()).toBeVisible();
    await expect(services.applications).toHaveCount(0);
    release();
    await expect(services.applications).toHaveCount(3);
    await expect(services.loading).toHaveCount(0);
  });

  // Mock admin-services/error.
  test('a queue that does not load offers Try again', async ({ page, api }) => {
    let calls = 0;
    api.on('GET', PATH, () => {
      calls += 1;
      return calls === 1 ? { abort: true } : applicationQueue(CAST_APPLICATIONS);
    });
    const services = new ManageServicesPage(page);

    await services.open();
    await expect(services.errorTitle).toHaveText("Services didn't load");
    await expect(services.errorText).toHaveText(
      "We couldn't reach the server. Applications you already decided are saved.",
    );

    await services.tryAgainButton.click();

    await expect(services.applications).toHaveCount(3);
    await expect(services.error).toHaveCount(0);
  });

  // L2-019 AC5: a Moderator is shown "Admins only" for the address; the queue is never asked for.
  test('a Moderator opening Services sees Admins only, not the queue', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.heading).toHaveText('Admins only');
    await expect(services.applications).toHaveCount(0);
  });
});
