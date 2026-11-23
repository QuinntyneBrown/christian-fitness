import { expect, test } from '../fixtures/test';
import { answerEvent, BOOTCAMP_DETAIL, type EventDetail } from '../fixtures/events';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebEventsPage } from '../page-objects/web/events.page';

const FULL: EventDetail = {
  ...BOOTCAMP_DETAIL,
  id: '0190c0de-0000-7000-8000-00000000e004',
  going: 50,
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
});
