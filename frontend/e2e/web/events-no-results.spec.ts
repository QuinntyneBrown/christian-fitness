import { expect, test } from '../fixtures/test';
import { answerEvents, BOOTCAMP, HOOPS_NIGHT, SUNRISE_5K } from '../fixtures/events';
import { WebEventsPage } from '../page-objects/web/events.page';

// L2-075 AC3, AC4 and L2-076 AC2 (ADR 0081; mocks `events/search-no-results`, `events/going-empty`):
// no results say why and offer to clear the search and filters, which restores the date list.
test.describe('Member app, events with no results', () => {
  test('A search with no matches says so, and Clear search and filters by keyboard restores every event and empties the field', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT]);
    const events = new WebEventsPage(page);
    await events.openWith('?category=run&q=yoga');
    await expect(events.noResultsHeading('No events match your search')).toBeVisible();
    await expect(events.noResultsText).toHaveText(
      'Try another search or clear the search and filters.',
    );
    await expect(events.cards).toHaveCount(0);
    await expect(events.filter('Run')).toHaveAttribute('aria-current', 'page');

    await events.clearSearchAndFilters.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.cards).toHaveCount(3);
    await expect(events.search).toHaveValue('');
    await expect(events.search).toBeFocused();
    await expect(events.filter('All')).toHaveAttribute('aria-current', 'page');
    expect(asked.searches).toEqual(['yoga', null]);
    expect(asked.categories).toEqual(['run', null]);
  });

  test("Only events I'm going to with none says so, and clearing restores the unfiltered date view", async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT], undefined, []);
    const events = new WebEventsPage(page);
    await events.openWith('?q=sunrise&going=true');
    await expect(events.noResultsHeading('No events you’re going to')).toBeVisible();
    await expect(events.noResultsText).toHaveText(
      'You have no upcoming registrations matching these filters.',
    );
    await expect(events.goingFilter).toBeChecked();

    await events.clearSearchAndFilters.click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(events.cards).toHaveCount(3);
    await expect(events.goingFilter).not.toBeChecked();
    await expect(events.search).toHaveValue('');
    expect(asked.going).toEqual(['true', null]);
  });

  test('A search that fails shows the error state, and Try again asks for the same search', async ({
    page,
    api,
  }) => {
    const asked = answerEvents(api, [SUNRISE_5K, BOOTCAMP, HOOPS_NIGHT], (n) =>
      n === 1 ? { abort: true } : null,
    );
    const events = new WebEventsPage(page);
    await events.open();
    await expect(events.cards).toHaveCount(3);

    await events.search.fill('hoops');
    await expect(events.errorHeading).toBeVisible();
    await events.retryButton.click();
    await expect(events.cards).toHaveCount(1);
    expect(asked.searches).toEqual([null, 'hoops', 'hoops']);
  });
});
