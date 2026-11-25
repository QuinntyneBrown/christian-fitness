import {
  HOOPS_NIGHT,
  PARK_BOOTCAMP,
  pickableEvents,
  SUNRISE_5K,
  SUNRISE_NOTE,
} from '../fixtures/community-pick';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { CommunityPickPage } from '../page-objects/admin/community-pick.page';

// L2-072 AC1, AC2 and AC13 (ADR 0098): Community Pick lists the published events to come as one
// radio group, soonest first, the first chosen, each with its date, title and area, and when it
// was last picked; the note says how many of its 70 characters are used.
test.describe('Admin app, Community Pick: the events and the note', () => {
  test('lists the events as one radio group with the first chosen, as the pick mock draws it', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const pick = new CommunityPickPage(page);

    await pick.open();

    await expect(pick.heading).toHaveText('Community Pick');
    await expect.poll(() => pick.title()).toBe('Community Pick · Christian Fitness Admin');
    await expect(pick.subtitle).toHaveText(
      'Choose an event and get branded posts for Instagram, Facebook, WhatsApp and Slack.',
    );
    await expect(pick.radios).toHaveCount(5);
    expect(await pick.choiceTexts()).toEqual([
      ['Sat Apr 18', 'Easter Sunrise 5K', 'Waterfront'],
      ['Tue Apr 21', 'Couch to 5K: Week 3', 'Etobicoke'],
      ['Sat Apr 25', 'Saturday Park Bootcamp', 'Waterfront'],
      ['Thu Apr 30', "Women's Hoops & Devotion Night", 'Downtown · Last picked Apr 6'],
      ['Wed May 06', 'Stretch & Pray: Mobility Morning', 'Scarborough'],
    ]);
    await expect(pick.radio('Easter Sunrise 5K')).toBeChecked();
    await expect(pick.choices.first().locator('img')).toHaveAttribute(
      'src',
      '/images/events/run.jpg',
    );
    await expect(pick.choices.nth(2).locator('img')).toHaveAttribute(
      'src',
      '/images/events/bootcamp.jpg',
    );
    await expect(pick.choices.first().locator('img')).toHaveAttribute('alt', '');
    await expect(pick.note).toHaveValue('');
    await expect(pick.noteHint).toHaveText(
      'One line. It goes on the graphics and in every caption. 0 of 70 characters.',
    );
    await expect(pick.createButton).toHaveText('Create assets');

    // Until assets are made the right side says what will be made (L2-072 AC3).
    await expect(pick.previewTitle).toHaveText('Five files, four platforms, one click');
    await expect(pick.previewText).toHaveText(
      'Instagram post and story, a Facebook and Slack link image, and a WhatsApp square, each with its caption ready to paste.',
    );
    await expect(pick.previewArt).toHaveAttribute('role', 'img');
    await expect(pick.previewArt).toHaveAttribute(
      'aria-label',
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );
    expect(await pick.previewArtTexts()).toEqual([
      'Community Pick',
      'Easter Sunrise 5K',
      'Sat Apr 18 · 6:45 AM · Waterfront',
      '',
    ]);
    await expect(pick.platforms).toHaveCount(0);
  });

  test('choosing an event by keyboard moves the choice, and the preview follows it', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const pick = new CommunityPickPage(page);
    await pick.open();
    await expect(pick.radio('Easter Sunrise 5K')).toBeChecked();

    await pick.radio('Easter Sunrise 5K').focus();
    await page.keyboard.press('ArrowDown');

    await expect(pick.radio('Couch to 5K: Week 3')).toBeChecked();
    await expect(pick.previewArt).toHaveAttribute(
      'aria-label',
      'Community Pick graphic: Couch to 5K: Week 3, Tue Apr 21',
    );

    await pick.choose('Saturday Park Bootcamp');

    await expect(pick.radio('Saturday Park Bootcamp')).toBeChecked();
    expect((await pick.previewArtTexts())[2]).toBe('Sat Apr 25 · 8:00 AM · Waterfront');
  });

  test('"Make it a pick" opens it with that event chosen (?event=<id>)', async ({ page, api }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const pick = new CommunityPickPage(page);

    await pick.open(`event=${HOOPS_NIGHT.id}`);

    await expect(pick.radio("Women's Hoops & Devotion Night")).toBeChecked();
    await expect(pick.eventGroup.getByRole('radio', { checked: true })).toHaveCount(1);
  });

  test('an event not listed in ?event= leaves the first chosen', async ({ page, api }) => {
    api.on('GET', '/api/admin/community-pick/events', () =>
      pickableEvents([SUNRISE_5K, PARK_BOOTCAMP]),
    );
    const pick = new CommunityPickPage(page);

    await pick.open(`event=${HOOPS_NIGHT.id}`);

    await expect(pick.radio('Easter Sunrise 5K')).toBeChecked();
  });

  test('the note counts its characters and takes at most 70', async ({ page, api }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const pick = new CommunityPickPage(page);
    await pick.open();

    await pick.writeNote(SUNRISE_NOTE);

    await expect(pick.noteHint).toHaveText(
      'One line. It goes on the graphics and in every caption. 60 of 70 characters.',
    );
    await expect(pick.note).toHaveAttribute('aria-describedby', 'f-note-hint');
    await expect(pick.note).toHaveAttribute('maxlength', '70');
    expect((await pick.previewArtTexts())[3]).toBe(SUNRISE_NOTE);

    await pick.note.fill('');
    await pick.note.pressSequentially('x'.repeat(75));

    await expect(pick.note).toHaveValue('x'.repeat(70));
    await expect(pick.noteHint).toHaveText(
      'One line. It goes on the graphics and in every caption. 70 of 70 characters.',
    );
  });

  // L2-072 AC11 (ADR 0064, ADR 0098): a Moderator opens and uses Community Pick as an Admin does.
  test('a Moderator finds it in the navigation and sees the same events', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const shell = new AdminShell(page);
    const pick = new CommunityPickPage(page);

    await shell.open('/');
    await shell.navItems.filter({ hasText: 'Community Pick' }).click();

    await expect(page).toHaveURL(/\/community-pick$/);
    await expect(pick.radios).toHaveCount(5);
    await expect(shell.navItems.filter({ hasText: 'Community Pick' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

// L2-072 AC11: skeleton rows while the events load, an empty state pointing to Events with none,
// and an error state whose Try again asks again.
test.describe('Admin app, Community Pick while loading, with nothing, and on failure', () => {
  // Mock admin-community-pick/loading: a gate holds the answer, so no clock is needed.
  test('shows skeleton rows while the events load', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/community-pick/events', async () => {
      await gate;
      return pickableEvents();
    });
    const pick = new CommunityPickPage(page);

    await pick.open();

    await expect(pick.loading).toBeVisible();
    await expect(pick.loadingLabel).toHaveText('Loading events');
    await expect(pick.skeletons).toHaveCount(4);
    release();

    await expect(pick.radios).toHaveCount(5);
    await expect(pick.loading).toHaveCount(0);
  });

  test('with no event to pick, says so and points to Events', async ({ page, api }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents([]));
    const pick = new CommunityPickPage(page);

    await pick.open();

    await expect(pick.emptyTitle).toHaveText('No events to pick yet');
    await expect(pick.emptyText).toHaveText(
      'A pick is made from a published event that is still to come.',
    );
    await expect(pick.goToEvents).toHaveAttribute('href', '/events');
    await expect(pick.eventGroup).toHaveCount(0);

    await pick.goToEvents.click();

    await expect(page).toHaveURL(/\/events$/);
  });

  test('events that do not load show "Events didn\'t load", and Try again loads them', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/admin/community-pick/events', () =>
      fail ? { abort: true } : pickableEvents(),
    );
    const pick = new CommunityPickPage(page);

    await pick.open();

    await expect(pick.error).toHaveAttribute('role', 'alert');
    await expect(pick.errorTitle).toHaveText("Events didn't load");
    await expect(pick.eventGroup).toHaveCount(0);
    fail = false;

    await pick.tryAgainButton.click();

    await expect(pick.radios).toHaveCount(5);
    await expect(pick.error).toHaveCount(0);
  });
});
