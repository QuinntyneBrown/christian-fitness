import {
  answerPickPhoto,
  answerPicks,
  HOOPS_NIGHT,
  PARK_BOOTCAMP,
  PICKABLE_EVENTS,
  pickableEvents,
  SUNRISE_5K,
  SUNRISE_NOTE,
  WHITE_PHOTO as WHITE,
  withPhoto,
} from '../fixtures/community-pick';
import { CAST_EVENTS, eventList, PUBLISHED_EVENTS } from '../fixtures/admin-events';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { CommunityPickPage } from '../page-objects/admin/community-pick.page';
import { AdminEventsPage } from '../page-objects/admin/events.page';

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

// L2-072 AC3, AC4, AC5, AC7, AC8, AC10, AC12, AC13 (ADR 0098): Create assets draws five PNGs in
// the browser at their platforms' sizes, from the event's photo or the brand pattern, shows them
// one platform at a time, each with its size and a PNG download, and records the pick; a change
// asks to recreate; a failure says so above a usable button.
test.describe('Admin app, Community Pick: creating the assets', () => {
  test(
    'Create assets reads "Creating…", then shows the five PNGs at their sizes and records the pick',
    { tag: '@critical' },
    async ({ page, api }) => {
      const events = [withPhoto(SUNRISE_5K), ...PICKABLE_EVENTS.slice(1)];
      api.on('GET', '/api/admin/community-pick/events', () => pickableEvents(events));
      let release = (): void => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const photo = answerPickPhoto(api, async () => {
        await gate;
        return { headers: { 'content-type': 'image/png' }, body: WHITE };
      });
      const sent = answerPicks(api);
      const pick = new CommunityPickPage(page);
      await pick.open();
      await pick.writeNote(`  ${SUNRISE_NOTE} `);

      await pick.create();

      await expect(pick.createButton).toHaveText('Creating…');
      await expect(pick.createButton).toHaveAttribute('aria-busy', 'true');
      await expect(pick.previewTitle).toHaveText('Five files, four platforms, one click');
      release();

      await expect(pick.currentPlatform).toHaveText('Instagram');
      await expect(pick.platformLinks).toHaveText(['Instagram', 'Facebook', 'WhatsApp', 'Slack']);
      await expect(pick.assetLabels).toHaveText(['Post · 1080 × 1080', 'Story · 1080 × 1920']);
      await expect(pick.assetImages).toHaveCount(2);
      await expect(pick.assetImages.first()).toHaveAttribute('src', /^blob:/);
      await expect(pick.assets.first().locator('.pick-art')).toHaveAttribute(
        'aria-label',
        'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
      );
      await expect(pick.preview).toHaveCount(0);
      await expect(pick.createButton).toHaveText('Create assets');
      await expect(pick.changedNotice).toHaveCount(0);
      // The preview showed the photo and the graphics were drawn from it; nothing asks again.
      const asked = photo.asked;

      // The pick is recorded with the trimmed note, and the list shows it in place (AC13).
      await expect.poll(() => sent).toEqual([{ eventId: SUNRISE_5K.id, note: SUNRISE_NOTE }]);
      await expect(pick.choices.first().locator('.event-choice__area')).toHaveText(
        'Waterfront · Last picked Apr 10',
      );

      // Each PNG downloads named for the pick, the event and the platform, at its size (AC4, AC7).
      expect(await pick.downloadPng('Post')).toEqual({
        name: 'community-pick-easter-sunrise-5k-instagram-post.png',
        width: 1080,
        height: 1080,
      });
      expect(await pick.downloadPng('Story')).toEqual({
        name: 'community-pick-easter-sunrise-5k-instagram-story.png',
        width: 1080,
        height: 1920,
      });
      // The hidden file name is positioned out of flow, so Chromium joins it with a space.
      await expect(pick.download('Post')).toHaveAccessibleName(
        /^PNG ?: community-pick-easter-sunrise-5k-instagram-post\.png$/,
      );

      await pick.showPlatform('Facebook');

      await expect(page).toHaveURL(/\/community-pick\?platform=facebook$/);
      await expect(pick.currentPlatform).toHaveText('Facebook');
      await expect(pick.assetLabels).toHaveText(['Link image · 1200 × 630']);
      expect(await pick.downloadPng('Link image')).toEqual({
        name: 'community-pick-easter-sunrise-5k-facebook.png',
        width: 1200,
        height: 630,
      });

      await pick.showPlatform('WhatsApp');

      await expect(pick.assetLabels).toHaveText(['Image · 1080 × 1080']);
      expect(await pick.downloadPng('Image')).toEqual({
        name: 'community-pick-easter-sunrise-5k-whatsapp.png',
        width: 1080,
        height: 1080,
      });

      await pick.showPlatform('Slack');

      await expect(pick.assetLabels).toHaveText(['Unfurl image · 1200 × 630']);
      expect(await pick.downloadPng('Unfurl image')).toEqual({
        name: 'community-pick-easter-sunrise-5k-slack.png',
        width: 1200,
        height: 630,
      });
      expect(photo.asked).toBe(asked);
    },
  );

  // AC5: the text meets 4.5:1 against what is behind it, even on the lightest photo there is. The
  // bands sampled are where the fixture's title, when line and note sit in each shape.
  test('on a white photo, what is under the text still meets 4.5:1 against white', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () =>
      pickableEvents([withPhoto(SUNRISE_5K)]),
    );
    answerPickPhoto(api);
    answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();
    await pick.writeNote(SUNRISE_NOTE);
    await pick.create();
    await expect(pick.assetImages).toHaveCount(2);

    expect(await pick.leastContrastUnderText('Post', 0.7, 0.94)).toBeGreaterThanOrEqual(4.5);
    expect(await pick.leastContrastUnderText('Story', 0.83, 0.96)).toBeGreaterThanOrEqual(4.5);

    await pick.showPlatform('Facebook');

    expect(await pick.leastContrastUnderText('Link image', 0.57, 0.88)).toBeGreaterThanOrEqual(4.5);
  });

  // No-image mock: an event with no photo gets the brand pattern; no photo is asked for.
  test('an event with no image is drawn on the brand pattern', async ({ page, api }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents([PARK_BOOTCAMP]));
    answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();

    await pick.create();

    await expect(pick.assetImages).toHaveCount(2);
    expect(await pick.downloadPng('Post')).toEqual({
      name: 'community-pick-saturday-park-bootcamp-instagram-post.png',
      width: 1080,
      height: 1080,
    });
  });

  // Changed mock (AC8): the assets shown stay those last made until Recreate.
  test('changing the event or the note asks to recreate, and Recreate makes them anew', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const sent = answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();
    await pick.writeNote(SUNRISE_NOTE);
    await pick.create();
    await expect(pick.assetImages).toHaveCount(2);
    const made = await pick.assetImages.first().getAttribute('src');

    await pick.writeNote(`${SUNRISE_NOTE} Bring water`);

    await expect(pick.changedNotice).toHaveText(
      'You changed the event or note. Recreate to update.',
    );
    await expect(pick.createButton).toHaveText('Recreate assets');
    await expect(pick.assetImages.first()).toHaveAttribute('src', made!);

    await pick.writeNote(SUNRISE_NOTE);

    await expect(pick.changedNotice).toHaveCount(0);
    await expect(pick.createButton).toHaveText('Create assets');

    await pick.choose('Saturday Park Bootcamp');

    await expect(pick.changedNotice).toHaveText(
      'You changed the event or note. Recreate to update.',
    );
    await expect(pick.assets.first().locator('.pick-art')).toHaveAttribute(
      'aria-label',
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );

    await pick.create();

    await expect(pick.assets.first().locator('.pick-art')).toHaveAttribute(
      'aria-label',
      'Community Pick graphic: Saturday Park Bootcamp, Sat Apr 25',
    );
    await expect(pick.changedNotice).toHaveCount(0);
    await expect(pick.createButton).toHaveText('Create assets');
    expect(sent.map((s) => s.eventId)).toEqual([SUNRISE_5K.id, PARK_BOOTCAMP.id]);
  });

  // Failed mock (AC10): the photo does not load, so nothing is made and nothing is recorded.
  test('when the assets cannot be made, a message says so above a usable button', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () =>
      pickableEvents([withPhoto(SUNRISE_5K)]),
    );
    let fail = true;
    answerPickPhoto(api, () =>
      fail
        ? { status: 500, json: { code: 'server_error' } }
        : { headers: { 'content-type': 'image/png' }, body: WHITE },
    );
    const sent = answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();

    await pick.create();

    await expect(pick.failure).toHaveText("We couldn't create the assets. Try again in a moment.");
    await expect(pick.createButton).toHaveText('Create assets');
    await expect(pick.createButton).toBeEnabled();
    await expect(pick.preview).toBeVisible();
    await expect(page).toHaveURL(/\/community-pick$/);
    expect(sent).toEqual([]);
    fail = false;

    await pick.create();

    await expect(pick.assetImages).toHaveCount(2);
    await expect(pick.failure).toHaveCount(0);
  });

  // ADR 0098: a pick that fails to record changes nothing on screen; the downloads stay usable.
  test('a pick that is not recorded leaves the assets and the list as they are', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    const sent = answerPicks(api, () => ({ status: 500, json: { code: 'server_error' } }));
    const pick = new CommunityPickPage(page);
    await pick.open();

    await pick.create();

    await expect(pick.assetImages).toHaveCount(2);
    await expect.poll(() => sent.length).toBe(1);
    await expect(pick.failure).toHaveCount(0);
    await expect(page).toHaveURL(/\/community-pick$/);
    await expect(pick.choices.first().locator('.event-choice__area')).toHaveText('Waterfront');
    expect((await pick.downloadPng('Post')).width).toBe(1080);
  });
});

// L2-072 AC4, AC6 and AC7 (ADR 0098): each platform's caption, in its own form, with the title,
// the note, when, the place, the price and the event's link; Copy puts it on the clipboard and
// says so; Slack also shows the post as a channel shows it. The texts are the mocks' captions,
// worked from the fixture's event (Sat Apr 18 at 6:45 AM in Toronto, free, 58 places left).
test.describe('Admin app, Community Pick: the captions', () => {
  const LINK = `https://www.christian.fitness/e/${SUNRISE_5K.id}`;

  test('each platform shows its caption in its own form, and Slack a preview of the post', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();
    await pick.writeNote(SUNRISE_NOTE);
    await pick.create();

    await expect(pick.captionText).toHaveText(
      [
        'Community Pick: Easter Sunrise 5K',
        '',
        SUNRISE_NOTE,
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        `Free. Link in bio, or register at www.christian.fitness/e/${SUNRISE_5K.id}`,
        '',
        '#ChristianFitness #CommunityPick #TorontoFitness #FaithAndFitness',
      ].join('\n'),
      { useInnerText: true },
    );
    await expect(pick.caption.getByRole('heading', { level: 3 })).toHaveText('Caption');
    await expect(pick.captionHint).toHaveCount(0);
    await expect(pick.slackPreview).toHaveCount(0);

    await pick.showPlatform('Facebook');

    await expect(pick.captionText).toHaveText(
      [
        'This week’s Community Pick: Easter Sunrise 5K.',
        '',
        SUNRISE_NOTE,
        '',
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park',
        'Free, 58 spots left.',
        '',
        `Register: ${LINK}`,
      ].join('\n'),
      { useInnerText: true },
    );
    await expect(pick.captionHint).toHaveCount(0);

    await pick.showPlatform('WhatsApp');

    await expect(pick.captionText).toHaveText(
      [
        '*Community Pick: Easter Sunrise 5K*',
        `_${SUNRISE_NOTE}_`,
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        'Free',
        '',
        `Register: ${LINK}`,
      ].join('\n'),
      { useInnerText: true },
    );
    await expect(pick.captionHint).toHaveText(
      'Asterisks and underscores format as bold and italic in WhatsApp.',
    );

    await pick.showPlatform('Slack');

    await expect(pick.captionText).toHaveText(
      [
        `*Community Pick:* <${LINK}|Easter Sunrise 5K>`,
        SUNRISE_NOTE,
        'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      ].join('\n'),
      { useInnerText: true },
    );
    await expect(pick.captionHint).toHaveText('Slack formatting: the title becomes a link.');
    await expect(pick.slackPreview).toBeVisible();
    await expect(pick.slackPreviewLines).toHaveText([
      /^Christian Fitness \d{1,2}:\d{2} [AP]M$/,
      'Community Pick: Easter Sunrise 5K',
      SUNRISE_NOTE,
      'Sat, Apr 18 at 6:45 AM · Martin Goodman Trail, Marilyn Bell Park · Free',
      'www.christian.fitness',
    ]);
    await expect(pick.slackPreviewImage).toHaveAttribute('src', /^blob:/);
    await expect(pick.slackPreview.locator('.pick-art')).toHaveAttribute(
      'aria-label',
      'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
    );
  });

  test('Copy puts the caption on the clipboard and reads "Copied" for about 2 seconds', async ({
    page,
    api,
  }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    api.on('GET', '/api/admin/community-pick/events', () => pickableEvents());
    answerPicks(api);
    const pick = new CommunityPickPage(page);
    await pick.open();
    await pick.writeNote(SUNRISE_NOTE);
    await pick.create();
    await pick.showPlatform('WhatsApp');
    await expect(pick.copyButton).toHaveAccessibleName('Copy caption');
    await expect(pick.copyStatus).toHaveText('');

    await pick.copyButton.click();

    await expect(pick.copyButton).toHaveAccessibleName('Copied caption');
    await expect(pick.copyStatus).toHaveText('Caption copied');
    expect(await pick.clipboard()).toBe(
      [
        '*Community Pick: Easter Sunrise 5K*',
        `_${SUNRISE_NOTE}_`,
        '',
        'Sat, Apr 18 at 6:45 AM',
        'Martin Goodman Trail, Marilyn Bell Park',
        'Free',
        '',
        `Register: ${LINK}`,
      ].join('\n'),
    );
    await expect(pick.copyButton).toHaveAccessibleName('Copy caption', { timeout: 4000 });
    await expect(pick.copyStatus).toHaveText('');
  });
});

// L2-072 AC1 (admin-events mocks): each published event still to come has "Make it a pick" in
// Events, which opens Community Pick with that event chosen. Mon Apr 20, 8:00 AM in Toronto: the
// Easter Sunrise 5K (Apr 18) has passed, three published events are to come, and one is a draft.
test.describe('Admin app, Community Pick from Events', () => {
  test('"Make it a pick" on a published event to come opens Community Pick with it chosen', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(new Date('2026-04-20T12:00:00Z'));
    api.on('GET', '/api/admin/events', () => eventList(CAST_EVENTS, CAST_EVENTS));
    const [, bootcamp, hoops, stretch] = PUBLISHED_EVENTS;
    api.on('GET', '/api/admin/community-pick/events', () =>
      pickableEvents([
        { ...PARK_BOOTCAMP, id: bootcamp.id },
        { ...HOOPS_NIGHT, id: hoops.id },
      ]),
    );
    const events = new AdminEventsPage(page);
    await events.open();

    await expect(events.pickLinks).toHaveText([
      `Make it a pick: ${bootcamp.title}`,
      `Make it a pick: ${hoops.title}`,
      `Make it a pick: ${stretch.title}`,
    ]);
    await expect(events.pickLink(hoops.title)).toHaveAttribute(
      'href',
      `/community-pick?event=${hoops.id}`,
    );
    await expect(events.editButton(hoops.title)).toBeVisible();

    await events.pickLink(hoops.title).click();

    await expect(page).toHaveURL(new RegExp(`/community-pick\\?event=${hoops.id}$`));
    const pick = new CommunityPickPage(page);
    await expect(pick.heading).toHaveText('Community Pick');
    await expect(pick.radio(hoops.title)).toBeChecked();
  });
});
