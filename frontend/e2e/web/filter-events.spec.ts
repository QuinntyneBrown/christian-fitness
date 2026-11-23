import { expect, test } from '../fixtures/test';
import { answerEvents, BOOTCAMP, generatedEvent, SUNRISE_5K } from '../fixtures/events';
import { WebEventsPage } from '../page-objects/web/events.page';

// L2-009 AC2, AC3, AC9 (ADR 0030): category navigation, empty results and history.
test.describe('Member app, filter events', () => {
  test('Selecting a category filters events without reloading, All shows every category, and Clear filter restores all events', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP]);
    const events = new WebEventsPage(page);
    await events.open();
    await expect(events.cards).toHaveCount(2);
    await expect(events.filter('All')).toHaveAttribute('aria-current', 'page');

    await page.evaluate(() => {
      (window as unknown as { __cfSpaMark?: string }).__cfSpaMark = 'kept';
    });

    await events.filter('Run').focus();
    await events.filter('Run').press('Enter');
    await expect(page).toHaveURL(/\/events\?category=run$/);
    await expect(events.cards).toHaveCount(1);
    expect((await events.rows()).map((row) => row.title)).toEqual(['Easter Sunrise 5K']);
    await expect(events.filter('Run')).toHaveAttribute('aria-current', 'page');
    await expect(events.filter('All')).not.toHaveAttribute('aria-current', 'page');

    await events.filter('All').click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.cards).toHaveCount(2);
    await expect(events.filter('All')).toHaveAttribute('aria-current', 'page');

    await events.filter('Workshop').click();
    await expect(events.noResults).toBeVisible();
    await expect(events.noResultsText).toHaveText(
      'No workshop events right now. New ones are posted every week.',
    );
    await expect(events.filter('Workshop')).toHaveAttribute('aria-current', 'page');

    await events.clearFilter.click();
    await expect(events.cards).toHaveCount(2);
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.filter('All')).toHaveAttribute('aria-current', 'page');
    expect(
      await page.evaluate(() => (window as unknown as { __cfSpaMark?: string }).__cfSpaMark),
    ).toBe('kept');
    expect(asked.categories).toEqual([null, 'run', null, 'workshop', null]);
  });

  for (const category of ['run', 'workout', 'basketball', 'mobility', 'workshop', 'retreat']) {
    test(`Opening ${category} directly restores its filter`, async ({ page, api }) => {
      const asked = answerEvents(api, [
        { ...SUNRISE_5K, category },
        { ...BOOTCAMP, category: 'other' },
      ]);
      const events = new WebEventsPage(page);
      await events.open(category);
      await expect(events.cards).toHaveCount(1);
      await expect(events.filter(category[0].toUpperCase() + category.slice(1))).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(asked.categories).toEqual([category]);
    });
  }

  test('An unknown category shows All; back restores the previous filter', async ({
    page,
    api,
  }) => {
    answerEvents(api, [SUNRISE_5K, BOOTCAMP]);
    const events = new WebEventsPage(page);
    await events.open('unknown');
    await expect(events.cards).toHaveCount(2);
    await expect(events.filter('All')).toHaveAttribute('aria-current', 'page');
    await events.filter('Run').click();
    await expect(events.cards).toHaveCount(1);
    await events.filter('Workout').click();
    await expect(events.filter('Workout')).toHaveAttribute('aria-current', 'page');
    await page.goBack();
    await expect(events.filter('Run')).toHaveAttribute('aria-current', 'page');
    expect((await events.rows()).map((row) => row.title)).toEqual(['Easter Sunrise 5K']);
  });

  test('Paging keeps the category and changing category discards the old cursor', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [
      ...Array.from({ length: 25 }, (_, i) => generatedEvent(i + 1)),
      BOOTCAMP,
    ]);
    const events = new WebEventsPage(page);
    await events.open('run');
    await expect(events.cards).toHaveCount(20);
    await events.scrollToEnd();
    await expect(events.cards).toHaveCount(25);
    await events.filter('Workout').click();
    await expect(events.cards).toHaveCount(1);
    expect(asked.cursors).toEqual([null, '20', null]);
    expect(asked.categories).toEqual(['run', 'run', 'workout']);
  });
});
