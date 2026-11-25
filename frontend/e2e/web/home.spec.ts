import { answerHome, BOOTCAMP, HOOPS_NIGHT, SUNRISE_5K } from '../fixtures/events';
import { expect, test } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';

/** Three days before the Easter Sunrise 5K, in Toronto. */
const TODAY = '2026-04-15T12:45:00Z';

// L2-007 AC1 to AC3: Home greets the member, shows their next event and the events that may suit
// them, invites them to browse with none, and offers Try again when it did not load (ADR 0044).
test.describe('Member app, home events', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(TODAY);
  });

  test(
    'Home shows the next event and the suggested events',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerHome(api, { nextEvent: SUNRISE_5K, suggested: [BOOTCAMP, HOOPS_NIGHT] });
      const home = new WebHomePage(page);

      await home.open();

      await expect(home.greeting).toHaveText('Welcome, Grace');
      await expect(home.nextTitle).toHaveText('Easter Sunrise 5K');
      await expect(home.nextPill).toHaveText("You're going · in 3 days");
      await expect(home.nextWhen).toHaveText('Sat, Apr 18 · 6:45 AM');
      await expect(home.nextPlace).toHaveText('Martin Goodman Trail, Marilyn Bell Park');
      await expect(home.detailsLink).toHaveAttribute('href', `/events/${SUNRISE_5K.id}`);
      await expect(home.groupChatLink).toHaveAttribute('href', `/events/${SUNRISE_5K.id}/chat`);
      await expect(home.invitation).toHaveCount(0);
      await expect(home.suggestedHeading).toBeVisible();
      await expect(home.allEventsLink).toHaveAttribute('href', '/events');
      expect(await home.rows()).toEqual([
        {
          href: `/events/${BOOTCAMP.id}`,
          month: 'Apr',
          day: '25',
          title: 'Saturday Park Bootcamp',
          meta: 'Sat 8:00 AM · Waterfront',
          end: '$10',
        },
        {
          href: `/events/${HOOPS_NIGHT.id}`,
          month: 'Apr',
          day: '30',
          title: "Women's Hoops & Devotion Night",
          meta: 'Thu 7:00 PM · Downtown',
          end: 'Free',
        },
      ]);
    },
  );

  test('With no registered event Home invites the member to browse Events', async ({
    page,
    api,
  }) => {
    answerHome(api, { nextEvent: null, suggested: [BOOTCAMP] });
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.invitationHeading).toBeVisible();
    await expect(home.browseEventsLink).toHaveAttribute('href', '/events');
    await expect(home.nextEvent).toHaveCount(0);
    await expect(home.suggestedRows).toHaveCount(1);
  });

  test('With nothing to suggest Home leaves out the suggestions', async ({ page, api }) => {
    answerHome(api, { nextEvent: SUNRISE_5K, suggested: [] });
    const home = new WebHomePage(page);

    await home.open();

    await expect(home.nextTitle).toHaveText('Easter Sunrise 5K');
    await expect(home.suggestedHeading).toHaveCount(0);
    await expect(home.suggestedRows).toHaveCount(0);
  });

  test('When Home does not load it says so and Try again loads it', async ({ page, api }) => {
    const asked = answerHome(api, { nextEvent: SUNRISE_5K, suggested: [] }, (n) =>
      n === 0 ? { abort: true } : null,
    );
    const home = new WebHomePage(page);

    await home.open();
    await expect(home.errorHeading).toBeVisible();
    await expect(home.nextEvent).toHaveCount(0);
    await home.retryButton.click();

    await expect(home.nextTitle).toHaveText('Easter Sunrise 5K');
    await expect(home.errorHeading).toHaveCount(0);
    expect(asked.count).toBe(2);
  });
});
