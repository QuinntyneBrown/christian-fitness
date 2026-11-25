import { answerListingProfile, OKAFOR, PROFILES } from '../fixtures/listing-profile';
import { answerService, answerServices, CAST, DANIELLE, MARCUS } from '../fixtures/services';
import { expect, test } from '../fixtures/test';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';
import { WebServiceDetailPage } from '../page-objects/web/service-detail.page';
import { WebServicesPage } from '../page-objects/web/services.page';

// ADR 0061 and ADR 0087 (journey 6): a directory listing and a Services listing of the same
// professional lead to each other (mocks `listing-profile/person` and `services/default`).
test.describe('Member app, listing and Services cross-links', () => {
  test('"Also offers services" on a profile leads to the professional\'s Services listing', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, [{ ...OKAFOR, serviceListingId: DANIELLE.id }]);
    const asked = answerService(api, CAST);
    const profile = new WebListingProfilePage(page);
    const detail = new WebServiceDetailPage(page);

    await profile.open(OKAFOR.id);
    await expect(profile.alsoOffersServices).toHaveAttribute('href', `/services/${DANIELLE.id}`);
    await profile.alsoOffersServices.click();

    await expect(page).toHaveURL(`/services/${DANIELLE.id}`);
    await expect(detail.card).toContainText('Danielle Okafor');
    expect(asked).toEqual([DANIELLE.id]);
  });

  test('A profile with no Services listing has no "Also offers services"', async ({
    page,
    api,
  }) => {
    answerListingProfile(api, PROFILES);
    const profile = new WebListingProfilePage(page);

    await profile.open(OKAFOR.id);

    await expect(profile.name).toHaveText('Danielle Okafor');
    await expect(profile.alsoOffersServices).toHaveCount(0);
  });

  test('"Also in the directory" on a Services card leads to the directory listing, and only where there is one', async ({
    page,
    api,
  }) => {
    answerServices(api, [{ ...DANIELLE, directoryListingId: OKAFOR.id }, MARCUS]);
    answerListingProfile(api, PROFILES);
    const services = new WebServicesPage(page);
    const profile = new WebListingProfilePage(page);

    await services.open();
    await expect(services.alsoInDirectory).toHaveAttribute('href', `/directory/${OKAFOR.id}`);
    await services.rows.nth(1).click();
    await expect(services.detail).toContainText(MARCUS.name);
    await expect(services.alsoInDirectory).toHaveCount(0);
    await services.rows.nth(0).click();
    await services.alsoInDirectory.click();

    await expect(page).toHaveURL(`/directory/${OKAFOR.id}`);
    await expect(profile.name).toHaveText('Danielle Okafor');
  });

  test('A professional\'s own screen shows "Also in the directory" too', async ({ page, api }) => {
    answerService(api, [{ ...DANIELLE, directoryListingId: OKAFOR.id }]);
    const detail = new WebServiceDetailPage(page);

    await detail.open(DANIELLE.id);

    await expect(detail.alsoInDirectory).toHaveAttribute('href', `/directory/${OKAFOR.id}`);
  });
});
