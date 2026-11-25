import { expect, test } from '../fixtures/test';
import {
  answerEvents,
  BOOTCAMP,
  generatedEvent,
  HOOPS_NIGHT,
  SUNRISE_5K,
} from '../fixtures/events';
import { WebEventsPage } from '../page-objects/web/events.page';

// L2-076 AC1, AC3, AC4 (ADR 0081): "Only events I'm going to" limits the date list to the
// member's own registrations, with the category and the search still applying.
test.describe("Member app, only events I'm going to", () => {
  test('The checkbox works by keyboard, shows only my events, combines with category and search, and clearing it restores the list', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT], undefined, [
      SUNRISE_5K.id,
      HOOPS_NIGHT.id,
    ]);
    const events = new WebEventsPage(page);
    await events.open();
    await expect(events.cards).toHaveCount(3);
    await expect(events.goingFilter).not.toBeChecked();

    await events.goingFilter.focus();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/\/events\?going=true$/);
    await expect(events.goingFilter).toBeChecked();
    await expect(events.cards).toHaveCount(2);
    expect((await events.rows()).map((row) => row.title)).toEqual([
      'Easter Sunrise 5K',
      "Women's Hoops & Devotion Night",
    ]);

    await events.filter('Basketball').click();
    await expect(page).toHaveURL(/\/events\?category=basketball&going=true$/);
    await expect(events.goingFilter).toBeChecked();
    await expect(events.cards).toHaveCount(1);

    await events.filter('All').click();
    await events.search.fill('sunrise');
    await expect(page).toHaveURL(/\/events\?q=sunrise&going=true$/);
    await expect(events.cards).toHaveCount(1);
    expect((await events.rows()).map((row) => row.title)).toEqual(['Easter Sunrise 5K']);

    await events.goingFilter.click();
    await expect(page).toHaveURL(/\/events\?q=sunrise$/);
    await expect(events.goingFilter).not.toBeChecked();
    await events.search.fill('');
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.cards).toHaveCount(3);
    expect(asked.going).toEqual([null, 'true', 'true', 'true', 'true', null, null]);
  });

  test('Opening an address with the filter ticks it; Back after changing it restores the previous list', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT], undefined, [BOOTCAMP.id]);
    const events = new WebEventsPage(page);
    await events.openWith('?going=true');
    await expect(events.goingFilter).toBeChecked();
    await expect(events.cards).toHaveCount(1);

    await events.goingFilter.click();
    await expect(events.cards).toHaveCount(3);
    await page.goBack();
    await expect(page).toHaveURL(/\/events\?going=true$/);
    await expect(events.goingFilter).toBeChecked();
    await expect(events.cards).toHaveCount(1);
  });

  test('Changing the filter starts paging again and replaces the cards', async ({ page, api }) => {
    const all = Array.from({ length: 25 }, (_, i) => generatedEvent(i + 1));
    const asked = answerEvents(
      api,
      all,
      undefined,
      all.slice(0, 22).map((event) => event.id),
    );
    const events = new WebEventsPage(page);
    await events.openWith('?going=true');
    await expect(events.cards).toHaveCount(20);
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(22);

    await events.goingFilter.click();
    await expect(events.cards).toHaveCount(20);
    expect(asked.cursors).toEqual([null, '20', null]);
    expect(asked.going).toEqual(['true', 'true', null]);
  });
});
