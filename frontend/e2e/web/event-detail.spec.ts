import { expect, test } from '../fixtures/test';
import {
  answerCancellation,
  answerEvent,
  answerRegistration,
  BOOTCAMP_DETAIL,
  type EventDetail,
  SUNRISE_DETAIL,
} from '../fixtures/events';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebEventsPage } from '../page-objects/web/events.page';

const FULL: EventDetail = {
  ...BOOTCAMP_DETAIL,
  id: '0190c0de-0000-7000-8000-00000000e004',
  going: 50,
  registration: null,
};

// L2-010 AC1, AC2: a member opens a published event and reads it; an unknown one is not found (ADR 0031).
test.describe('Member app, event detail', () => {
  test('shows the picture, title, category, date, time, place, area, summary, price and spots left', async ({
    page,
    api,
  }) => {
    answerEvent(api, [BOOTCAMP_DETAIL]);
    const detail = new WebEventDetailPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);

    await expect(detail.eventTitle).toHaveText('Saturday Park Bootcamp');
    await expect.poll(() => detail.title()).toBe('Event · Christian Fitness');
    await expect(detail.eyebrow).toHaveText('Workout');
    await expect(detail.facts).toHaveText([
      /^Sat, Apr 25\s*8:00 AM$/,
      /^Trillium Park, Ontario Place\s*Waterfront$/,
    ]);
    await expect(detail.about).toHaveText(BOOTCAMP_DETAIL.summary);
    await expect(detail.price).toHaveText('$10');
    await expect(detail.spots).toHaveText('12 of 50 spots left');
    await expect(detail.going).toHaveText('38 going');
    // With no picture of its own, the event shows its category's photo from the app itself.
    await expect(detail.image).toHaveAttribute('src', '/images/events/bootcamp.jpg');
  });

  test('a full event says no spots are left', async ({ page, api }) => {
    answerEvent(api, [FULL]);
    const detail = new WebEventDetailPage(page);

    await detail.open(FULL.id);

    await expect(detail.spots).toHaveText('0 of 50 spots left');
    await expect(detail.going).toHaveText('50 going');
  });

  // L2-011 AC2, AC3 (ADR 0033): a full event offers no Register; losing the last place says so.
  test('a full event says "This event is full" in place of Register', async ({ page, api }) => {
    answerEvent(api, [FULL]);
    const detail = new WebEventDetailPage(page);

    await detail.open(FULL.id);

    await expect(detail.full).toHaveText('This event is full');
    await expect(detail.registerButton).toHaveCount(0);
  });

  test('losing the last place to another member shows "This event is full" and no error', async ({
    page,
    api,
  }) => {
    answerEvent(api, [{ ...FULL, going: 49 }]);
    const asked = answerRegistration(api, FULL, { status: 409, code: 'event_full' });
    const detail = new WebEventDetailPage(page);

    await detail.open(FULL.id);
    await expect(detail.spots).toHaveText('1 of 50 spots left');
    await detail.registerButton.click();

    await expect(detail.full).toHaveText('This event is full');
    await expect(detail.spots).toHaveText('0 of 50 spots left');
    await expect(detail.going).toHaveText('50 going');
    await expect(detail.registerButton).toHaveCount(0);
    await expect(detail.registerError).toHaveCount(0);
    expect(asked).toEqual([FULL.id]);
  });

  test("a member already going to a full event sees you're going, not full", async ({
    page,
    api,
  }) => {
    answerEvent(api, [{ ...FULL, registration: 'confirmed' }]);
    const detail = new WebEventDetailPage(page);

    await detail.open(FULL.id);

    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.full).toHaveCount(0);
  });

  test('an event that is not there shows the not-found screen', async ({ page, api }) => {
    answerEvent(api, []);
    const detail = new WebEventDetailPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);

    await expect(detail.heading).toHaveText('Page not found');
    await expect(detail.code).toHaveText('404');
    await expect(detail.action('Browse events')).toHaveAttribute('href', '/events');
  });

  test('a failed request shows "This event didn\'t load" and Try again asks again', async ({
    page,
    api,
  }) => {
    let failing = true;
    answerEvent(api, [BOOTCAMP_DETAIL]);
    api.on('GET', /^\/api\/events\/[0-9a-f-]{36}$/, () =>
      failing ? { status: 400, json: { code: 'error' } } : { json: BOOTCAMP_DETAIL },
    );
    const detail = new WebEventDetailPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);
    await expect(detail.errorHeading).toBeVisible();
    failing = false;
    await detail.retryButton.click();

    await expect(detail.eventTitle).toHaveText('Saturday Park Bootcamp');
  });

  test('All events goes back to the list', async ({ page, api }) => {
    answerEvent(api, [BOOTCAMP_DETAIL]);
    api.on('GET', '/api/events', () => ({ json: { events: [BOOTCAMP_DETAIL], nextCursor: null } }));
    const detail = new WebEventDetailPage(page);
    const events = new WebEventsPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);
    await detail.backLink.click();

    await expect(events.heading).toHaveText('Events');
    await expect(events.cards).toHaveCount(1);
  });

  test('a card on the list opens its event', async ({ page, api }) => {
    answerEvent(api, [BOOTCAMP_DETAIL]);
    api.on('GET', '/api/events', () => ({ json: { events: [BOOTCAMP_DETAIL], nextCursor: null } }));
    const events = new WebEventsPage(page);
    const detail = new WebEventDetailPage(page);

    await events.open();
    await events.cards.first().click();

    await expect(detail.eventTitle).toHaveText('Saturday Park Bootcamp');
  });

  // L2-011 AC1, AC4, AC5, AC6 and L2-010 AC1, AC3: registering takes a place and the screen says so (ADR 0032).
  test("Register takes a place, says you're going and counts one more going", async ({
    page,
    api,
  }) => {
    answerEvent(api, [SUNRISE_DETAIL]);
    const asked = answerRegistration(api, SUNRISE_DETAIL);
    const detail = new WebEventDetailPage(page);

    await detail.open(SUNRISE_DETAIL.id);
    await expect(detail.going).toHaveText('142 going');
    await detail.registerButton.click();

    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.going).toHaveText('143 going');
    await expect(detail.spots).toHaveText('57 of 200 spots left');
    await expect(detail.registerButton).toHaveCount(0);
    expect(asked).toEqual([SUNRISE_DETAIL.id]);
  });

  test('a paid event is reserved and the page says how to pay', async ({ page, api }) => {
    answerEvent(api, [BOOTCAMP_DETAIL]);
    answerRegistration(api, BOOTCAMP_DETAIL);
    const detail = new WebEventDetailPage(page);

    await detail.open(BOOTCAMP_DETAIL.id);
    await detail.registerButton.click();

    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.registerNote).toHaveText(
      'Your spot is reserved. Pay the Christian Fitness team at the event; online payment is not available yet.',
    );
  });

  test("a member already registered sees you're going and no Register button", async ({
    page,
    api,
  }) => {
    answerEvent(api, [{ ...SUNRISE_DETAIL, registration: 'confirmed' }]);
    const detail = new WebEventDetailPage(page);

    await detail.open(SUNRISE_DETAIL.id);

    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.registerButton).toHaveCount(0);
    await expect(detail.registerNote).toHaveCount(0);
  });

  test('a refused registration shows a generic message and Register stays usable', async ({
    page,
    api,
  }) => {
    answerEvent(api, [SUNRISE_DETAIL]);
    answerRegistration(api, SUNRISE_DETAIL, { status: 403, code: 'account_suspended' });
    const detail = new WebEventDetailPage(page);

    await detail.open(SUNRISE_DETAIL.id);
    await detail.registerButton.click();

    await expect(detail.registerError).toHaveText(/We couldn't register you/);
    await expect(detail.registerButton).toBeEnabled();
    await expect(detail.confirmed).toHaveCount(0);
    await expect(detail.going).toHaveText('142 going');
  });

  // L2-012 AC1, AC2 (ADR 0034): Can't make it asks in a dialog, and confirming frees the place.
  test('confirming Cancel registration frees the place and offers Register again', async ({
    page,
    api,
  }) => {
    const going: EventDetail = { ...SUNRISE_DETAIL, registration: 'confirmed' };
    answerEvent(api, [going]);
    const asked = answerCancellation(api, going);
    const detail = new WebEventDetailPage(page);

    await detail.open(going.id);
    await detail.cantMakeItButton.click();
    await expect(detail.cancelDialog).toBeVisible();
    await detail.cancelConfirmButton.click();

    await expect(detail.cancelDialog).toHaveCount(0);
    await expect(detail.registerButton).toBeVisible();
    await expect(detail.confirmed).toHaveCount(0);
    await expect(detail.going).toHaveText('141 going');
    await expect(detail.spots).toHaveText('59 of 200 spots left');
    expect(asked).toEqual([going.id]);
  });

  test('Keep my place closes the dialog and asks nothing', async ({ page, api }) => {
    const going: EventDetail = { ...SUNRISE_DETAIL, registration: 'confirmed' };
    answerEvent(api, [going]);
    const asked = answerCancellation(api, going);
    const detail = new WebEventDetailPage(page);

    await detail.open(going.id);
    await detail.cantMakeItButton.click();
    await detail.keepPlaceButton.click();

    await expect(detail.cancelDialog).toHaveCount(0);
    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.going).toHaveText('142 going');
    expect(asked).toEqual([]);
  });

  test('a refused cancel keeps the dialog with a generic message and the place', async ({
    page,
    api,
  }) => {
    const going: EventDetail = { ...SUNRISE_DETAIL, registration: 'confirmed' };
    answerEvent(api, [going]);
    answerCancellation(api, going, { status: 409, code: 'event_started' });
    const detail = new WebEventDetailPage(page);

    await detail.open(going.id);
    await detail.cantMakeItButton.click();
    await detail.cancelConfirmButton.click();

    await expect(detail.cancelError).toContainText("Couldn't cancel your registration");
    await expect(detail.cancelConfirmButton).toBeEnabled();
    await detail.keepPlaceButton.click();
    await expect(detail.confirmed).toHaveText("You're going");
    await expect(detail.going).toHaveText('142 going');
  });
});
