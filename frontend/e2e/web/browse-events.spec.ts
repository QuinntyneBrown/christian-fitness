import { expect, test } from '../fixtures/test';
import {
  answerEvents,
  BOOTCAMP,
  generatedEvent,
  HOOPS_NIGHT,
  SUNRISE_5K,
} from '../fixtures/events';
import { WebEventsPage } from '../page-objects/web/events.page';

const MANY = Array.from({ length: 45 }, (_, i) => generatedEvent(i + 1));

// L2-009 AC1: Events lists the published upcoming events as cards, soonest first (ADR 0027).
test.describe('Member app, browse events', () => {
  test('Events shows each event as a card with its date, time, place, going and price', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT]);
    const events = new WebEventsPage(page);

    await events.open();

    await expect(events.heading).toHaveText('Events');
    await expect.poll(() => events.title()).toBe('Events · Christian Fitness');
    await expect(events.cards).toHaveCount(3);
    expect(await events.rows()).toEqual([
      {
        href: `/events/${SUNRISE_5K.id}`,
        month: 'Apr',
        day: '18',
        meta: 'Run · Apr 18, Sat 6:45 AM',
        title: 'Easter Sunrise 5K',
        place: 'Martin Goodman Trail, Marilyn Bell Park',
        going: '142 going',
        end: 'Free',
      },
      {
        href: `/events/${BOOTCAMP.id}`,
        month: 'Apr',
        day: '25',
        meta: 'Workout · Apr 25, Sat 8:00 AM',
        title: 'Saturday Park Bootcamp',
        place: 'Trillium Park, Ontario Place',
        going: '38 going',
        end: '$10',
      },
      {
        href: `/events/${HOOPS_NIGHT.id}`,
        month: 'Apr',
        day: '30',
        meta: 'Basketball · Apr 30, Thu 7:00 PM',
        title: "Women's Hoops & Devotion Night",
        place: 'St. Lawrence Community Rec Centre',
        going: '24 going',
        end: '6 spots left',
      },
    ]);
    // With no picture of its own, a card shows its category's photo from the app itself.
    expect(await events.images()).toEqual([
      '/images/events/run.jpg',
      '/images/events/bootcamp.jpg',
      '/images/events/hoops.jpg',
    ]);
  });

  test('The header lists Home and Events, with Events current', async ({ page, api }) => {
    answerEvents(api, [SUNRISE_5K]);
    const events = new WebEventsPage(page);

    await events.open();

    await expect(events.navLinks).toHaveText(['Home', 'Events']);
    await expect(events.currentNavLink).toHaveText('Events');
  });

  // L2-009 AC5: the next 20 load when the member reaches the end.
  test('Scrolling to the end asks for the next page, until there is none', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, MANY);
    const events = new WebEventsPage(page);

    await events.open();
    await expect(events.cards).toHaveCount(20);
    expect(asked.cursors).toEqual([null]);
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(40);
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(45);
    await events.scrollToEnd();

    // Three pages in all, each asked for once and in order, none after the last.
    expect(asked.cursors).toEqual([null, '20', '40']);
    await expect(events.cards.nth(44).locator('.event-card__title')).toHaveText(
      'Generated event 45',
    );
  });

  // L2-009 AC7: a next page that does not load leaves the cards and offers Try again.
  test('A next page that fails keeps the cards and Try again loads it', async ({ page, api }) => {
    const asked = answerEvents(api, MANY, (n) => (n === 1 ? { abort: true } : null));
    const events = new WebEventsPage(page);

    await events.open();
    await expect(events.cards).toHaveCount(20);
    await events.scrollToEnd();

    await expect(events.moreErrorHeading).toBeVisible();
    await expect(events.cards).toHaveCount(20);
    await events.moreRetryButton.click();
    await expect(events.cards).toHaveCount(40);
    await expect(events.moreErrorHeading).toBeHidden();
    expect(asked.cursors).toEqual([null, '20', '20']);
  });

  // L2-009 AC7: at 200 events no more are asked for and the list ends with a note.
  test('The list stops at 200 events and says so', async ({ page, api }) => {
    const all = Array.from({ length: 260 }, (_, i) => generatedEvent(i + 1));
    const asked = answerEvents(api, all);
    const events = new WebEventsPage(page);

    await events.open();
    for (let count = 20; count <= 200; count += 20) {
      await expect(events.cards).toHaveCount(count);
      await events.scrollToEnd();
    }

    await expect(events.cappedNote).toBeVisible();
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(200);
    expect(asked.cursors).toHaveLength(10);
  });

  // L2-009 AC6: loading, empty and error states.
  test('While the first page loads it shows skeleton cards', async ({ page, api }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/events', async () => {
      await held;
      return { json: { events: [SUNRISE_5K], nextCursor: null } };
    });
    const events = new WebEventsPage(page);

    await events.open();

    await expect(events.loading).toHaveAttribute('aria-busy', 'true');
    await expect(events.loadingHeading).toBeAttached();
    await expect(events.skeletons.first()).toBeVisible();
    release();
    await expect(events.cards).toHaveCount(1);
    await expect(events.loading).toHaveCount(0);
  });

  test('With no events it says so and points home', async ({ page, api }) => {
    answerEvents(api, []);
    const events = new WebEventsPage(page);

    await events.open();

    await expect(events.emptyHeading).toBeVisible();
    await expect(events.backHomeLink).toHaveAttribute('href', '/home');
    await expect(events.cards).toHaveCount(0);
  });

  test('When the events cannot be reached it offers Try again, which asks again', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K], (n) => (n === 0 ? { abort: true } : null));
    const events = new WebEventsPage(page);

    await events.open();
    await expect(events.errorHeading).toBeVisible();
    await events.retryButton.click();

    await expect(events.cards).toHaveCount(1);
    await expect(events.errorHeading).toBeHidden();
    expect(asked.cursors).toEqual([null, null]);
  });
});
