import { answerPhotos } from '../fixtures/directory';
import {
  answerEvent,
  answerRegistration,
  BOOTCAMP_DETAIL,
  type EventDetail,
  hostCardOf,
  SUNRISE_DETAIL,
} from '../fixtures/events';
import {
  answerListingProfile,
  NORTHLINE,
  OKAFOR,
  PROFILES,
  TEAM,
} from '../fixtures/listing-profile';
import { expect, test } from '../fixtures/test';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebListingProfilePage } from '../page-objects/web/listing-profile.page';

/** The Bootcamp hosted by Danielle Okafor, a verified instructor with a photo. */
const BY_OKAFOR: EventDetail = { ...BOOTCAMP_DETAIL, host: hostCardOf(OKAFOR) };

/** The Bootcamp hosted by Northline Athletic, an unverified company. */
const BY_NORTHLINE: EventDetail = { ...BOOTCAMP_DETAIL, host: hostCardOf(NORTHLINE) };

// L2-010 AC4 (ADR 0089): every event shows who hosts it under the registration card, with the
// listing's mark, kind, name and Verified mark, and leads to the listing's profile.
test.describe('Member app, who hosts an event', () => {
  test('a team event shows "Hosted by · Organization", Christian Fitness and the Verified mark', async ({
    page,
    api,
  }) => {
    answerEvent(api, [SUNRISE_DETAIL]);
    const detail = new WebEventDetailPage(page);

    await detail.open(SUNRISE_DETAIL.id);

    await expect(detail.hostCard).toHaveCount(1);
    await expect(detail.hostLabel).toHaveText('Hosted by · Organization');
    await expect(detail.hostName).toHaveText('Christian Fitness');
    await expect(detail.hostVerified).toHaveCount(1);
    await expect(detail.hostMark).toHaveText('CF');
    await expect(detail.hostCard).toHaveAttribute('href', `/directory/${TEAM.id}`);
    await expect(detail.hostCard).toHaveAccessibleName(
      'Hosted by · Organization Christian Fitness Verified',
    );
    await expect(detail.aside).not.toContainText('Posted by the Christian Fitness team');
  });

  test("an instructor's event shows her photo and kind", async ({ page, api }) => {
    answerPhotos(api);
    answerEvent(api, [BY_OKAFOR]);
    const detail = new WebEventDetailPage(page);

    await detail.open(BY_OKAFOR.id);

    await expect(detail.hostLabel).toHaveText('Hosted by · Instructor');
    await expect(detail.hostName).toHaveText('Danielle Okafor');
    await expect(detail.hostMark).toHaveAttribute(
      'src',
      `/api/directory/photos/${OKAFOR.photoKey}`,
    );
    await expect(detail.hostMark).toHaveAttribute('alt', '');
  });

  test('an unverified host has no Verified mark', async ({ page, api }) => {
    answerEvent(api, [BY_NORTHLINE]);
    const detail = new WebEventDetailPage(page);

    await detail.open(BY_NORTHLINE.id);

    await expect(detail.hostName).toHaveText('Northline Athletic');
    await expect(detail.hostLabel).toHaveText('Hosted by · Company');
    await expect(detail.hostVerified).toHaveCount(0);
  });

  test('the card leads to the host profile', async ({ page, api }) => {
    answerEvent(api, [BY_NORTHLINE]);
    answerListingProfile(api, PROFILES);
    const detail = new WebEventDetailPage(page);
    const profile = new WebListingProfilePage(page);
    await detail.open(BY_NORTHLINE.id);

    await detail.hostCard.click();

    await expect(page).toHaveURL(`/directory/${NORTHLINE.id}`);
    await expect(profile.name).toHaveText('Northline Athletic');
  });

  test('the card stays after registering', async ({ page, api }) => {
    answerEvent(api, [SUNRISE_DETAIL]);
    answerRegistration(api, SUNRISE_DETAIL);
    const detail = new WebEventDetailPage(page);
    await detail.open(SUNRISE_DETAIL.id);

    await detail.registerButton.click();

    await expect(detail.confirmed).toBeVisible();
    await expect(detail.hostName).toHaveText('Christian Fitness');
  });
});
