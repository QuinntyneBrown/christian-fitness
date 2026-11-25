import { expect, test } from '../fixtures/test';
import {
  answerEvents,
  BOOTCAMP,
  generatedEvent,
  HOOPS_NIGHT,
  SUNRISE_5K,
} from '../fixtures/events';
import { WebEventsPage } from '../page-objects/web/events.page';

// L2-075 AC1 to AC5 (ADR 0081): the "Search events" field narrows the date list by title.
test.describe('Member app, search events', () => {
  test('Typing narrows the list to matching titles once typing pauses, keeps the category, and blank text narrows nothing', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT]);
    const events = new WebEventsPage(page);
    await events.open();
    await expect(events.cards).toHaveCount(3);

    await events.search.focus();
    await events.typeSearch('  SUNRISE ');
    await expect(page).toHaveURL(/\/events\?q=SUNRISE$/);
    await expect(events.cards).toHaveCount(1);
    expect((await events.rows()).map((row) => row.title)).toEqual(['Easter Sunrise 5K']);
    // One question for the whole word, not one a letter; the field keeps what was typed.
    expect(asked.searches).toEqual([null, 'SUNRISE']);
    await expect(events.search).toHaveValue('  SUNRISE ');

    await events.filter('Run').click();
    await expect(page).toHaveURL(/\/events\?category=run&q=SUNRISE$/);
    await expect(events.cards).toHaveCount(1);
    await expect(events.search).toHaveValue('  SUNRISE ');

    await events.search.fill('   ');
    await expect(page).toHaveURL(/\/events\?category=run$/);
    await expect(events.cards).toHaveCount(1);
    expect(asked.searches.at(-1)).toBeNull();
    expect(asked.categories.at(-1)).toBe('run');
  });

  test('Opening an address with a search fills the field and asks for it; Escape clears it', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT]);
    const events = new WebEventsPage(page);
    await events.openWith('?q=hoops');
    await expect(events.cards).toHaveCount(1);
    expect((await events.rows()).map((row) => row.title)).toEqual([
      "Women's Hoops & Devotion Night",
    ]);
    await expect(events.search).toHaveValue('hoops');
    expect(asked.searches).toEqual(['hoops']);

    await events.search.focus();
    await events.search.press('Escape');
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.cards).toHaveCount(3);
    await expect(events.search).toHaveValue('');
  });

  test('A search pages by its own cursor, and a new search starts again and replaces the cards', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [
      ...Array.from({ length: 25 }, (_, i) => generatedEvent(i + 1)),
      BOOTCAMP,
    ]);
    const events = new WebEventsPage(page);
    await events.openWith('?q=generated');
    await expect(events.cards).toHaveCount(20);
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(25);

    await events.search.fill('bootcamp');
    await expect(page).toHaveURL(/\/events\?q=bootcamp$/);
    await expect(events.cards).toHaveCount(1);
    expect(asked.cursors).toEqual([null, '20', null]);
    expect(asked.searches).toEqual(['generated', 'generated', 'bootcamp']);
  });
});
