import { answerPreferences, GRACE_PREFERENCES } from '../fixtures/preferences';
import { expect, test } from '../fixtures/test';
import { PreferencesPage } from '../page-objects/web/preferences.page';

const NOTIFICATIONS_OFF = { ...GRACE_PREFERENCES.notifications, messages: false };

// L2-064 (journey 33; mocks preferences/default, unsaved, saving, saved, failed, unsubscribed,
// loading, error): a member's email and notification switches, saved together from a save bar.
test.describe('Member app, Preferences: email and notifications', () => {
  test(
    'shows the member, the sections and each switch as it is saved',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerPreferences(api);
      const preferences = new PreferencesPage(page);

      await preferences.open();

      await expect(preferences.heading).toHaveText('Preferences');
      await expect.poll(() => page.title()).toBe('Preferences · Christian Fitness');
      await expect(preferences.subtitle).toHaveText(
        'What we send you, what other members see, and what we suggest. Signed in as Grace Thompson.',
      );
      await expect(preferences.backLink).toHaveAttribute('href', '/profile');
      await expect(preferences.sectionLinks).toHaveText([
        'Email',
        'Notifications',
        'Privacy',
        'Suggestions',
        'Your data',
      ]);
      await expect(preferences.sectionLinks.first()).toHaveAttribute('href', '/preferences#email');
      await expect(preferences.emailSummary).toHaveText('3 of 4 emails on.');
      expect(await preferences.switchValues(preferences.email)).toEqual([
        ['The Abundant Weekly', true],
        ['Event alerts', true],
        ['Training plan of the week', false],
        ['Morning devotion', true],
      ]);
      expect((await preferences.descriptions(preferences.email))[1]).toBe(
        'New runs, workouts and retreats. Not sending yet.',
      );
      expect(await preferences.switchValues(preferences.notifications)).toEqual([
        ['Event reminders', true],
        ['Messages', true],
        ['New dates from listings you follow', true],
        ['Changes to your events', true],
      ]);
      await expect(preferences.turnOffAllEmail).toBeVisible();
      await expect(preferences.saveBar).toHaveCount(0);
    },
  );

  test('a change shows "Unsaved changes"; Save keeps every change together and says so for 2 seconds', async ({
    page,
    api,
  }) => {
    await page.clock.install({ time: new Date('2026-04-15T12:45:00Z') });
    const saves = answerPreferences(api);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route('**/api/preferences', async (route) => {
      if (route.request().method() === 'PUT') await gate;
      await route.fallback();
    });
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await preferences.switch('Training plan of the week').check();
    await preferences.switch('Messages').uncheck();

    await expect(preferences.emailSummary).toHaveText('4 of 4 emails on.');
    await expect(preferences.saveBarText).toHaveText('Unsaved changes');
    await expect(preferences.saveBar).toHaveAttribute('role', 'status');
    await expect(preferences.saveButton).toHaveText('Save');
    expect(saves).toEqual([]);
    // Putting a switch back as it was saved hides the bar: nothing differs.
    await preferences.switch('Training plan of the week').uncheck();
    await preferences.switch('Messages').check();
    await expect(preferences.saveBar).toHaveCount(0);

    await preferences.switch('Training plan of the week').check();
    await preferences.switch('Messages').uncheck();
    await preferences.saveButton.click();

    await expect(preferences.saveButton).toHaveText('Saving…');
    await expect(preferences.saveButton).toHaveAttribute('aria-busy', 'true');
    await expect(preferences.switch('Messages')).toBeDisabled();
    release();
    await expect(preferences.saveBarText).toHaveText('Preferences saved');
    await expect(preferences.saveBar).toHaveAttribute('role', 'status');
    await expect(preferences.saveButton).toHaveCount(0);
    expect(saves).toEqual([
      {
        email: { ...GRACE_PREFERENCES.email, trainingPlan: true },
        notifications: NOTIFICATIONS_OFF,
        privacy: GRACE_PREFERENCES.privacy,
        suggestions: GRACE_PREFERENCES.suggestions,
      },
    ]);
    await page.clock.fastForward(1_900);
    await expect(preferences.saveBar).toHaveCount(1);
    await page.clock.fastForward(200);
    // Gone at 2 seconds, not merely before the assertion's own patience runs out.
    await expect(preferences.saveBar).toHaveCount(0, { timeout: 1_000 });
    await expect(preferences.switch('Messages')).toBeEnabled();
    await expect(preferences.switch('Messages')).not.toBeChecked();
  });

  test('Turn off all email turns the four off, says what that means, and is no longer offered', async ({
    page,
    api,
  }) => {
    const saves = answerPreferences(api);
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await preferences.turnOffAllEmail.click();

    // What the press changes is drawn on the next render: poll it, never read it once.
    await expect
      .poll(async () => (await preferences.switchValues(preferences.email)).map(([, on]) => on))
      .toEqual([false, false, false, false]);
    await expect(preferences.emailSummary).toHaveText(
      'You won’t get any email from us except security and service notices.',
    );
    await expect(preferences.turnOffAllEmail).toHaveCount(0);
    await preferences.saveButton.click();
    await expect(preferences.saveBarText).toHaveText('Preferences saved');
    expect(saves[0].email).toEqual({
      weekly: false,
      eventAlerts: false,
      trainingPlan: false,
      devotion: false,
    });
  });

  test('a save that fails says so as an alert with Try again, and the changes stay', async ({
    page,
    api,
  }) => {
    const saves = answerPreferences(api);
    let fail = true;
    api.on('PUT', '/api/preferences', (request) => {
      if (fail) return { abort: true };
      saves.push(request.postDataJSON());
      return { json: { ...GRACE_PREFERENCES, notifications: NOTIFICATIONS_OFF } };
    });
    const preferences = new PreferencesPage(page);
    await preferences.open();
    await preferences.switch('Messages').uncheck();

    await preferences.saveButton.click();

    await expect(preferences.saveBarText).toHaveText('Couldn’t save. Your changes are still here.');
    await expect(preferences.saveBar).toHaveAttribute('role', 'alert');
    await expect(preferences.saveButton).toHaveText('Try again');
    await expect(preferences.switch('Messages')).not.toBeChecked();
    fail = false;
    await preferences.saveButton.click();
    await expect(preferences.saveBarText).toHaveText('Preferences saved');
    expect(saves).toHaveLength(1);
  });

  test('leaving with unsaved changes asks first: staying keeps them, leaving goes', async ({
    page,
    api,
  }) => {
    answerPreferences(api);
    const preferences = new PreferencesPage(page);
    await preferences.open();
    await preferences.switch('Messages').uncheck();
    const asked: [string, string][] = [];
    let leave = false;
    page.on('dialog', (dialog) => {
      asked.push([dialog.type(), dialog.message()]);
      void (leave ? dialog.accept() : dialog.dismiss());
    });

    // A move inside the app asks the question in words.
    await preferences.bell.click();

    await expect
      .poll(() => asked)
      .toEqual([['confirm', 'You have unsaved changes. Leave without saving?']]);
    expect(preferences.path()).toBe('/preferences');
    await expect(preferences.switch('Messages')).not.toBeChecked();
    // A link that loads a page asks through the browser's own question.
    await preferences.backLink.click();
    await expect.poll(() => asked.map(([type]) => type)).toEqual(['confirm', 'beforeunload']);
    expect(preferences.path()).toBe('/preferences');

    leave = true;
    await preferences.bell.click();
    await expect.poll(() => preferences.path()).toBe('/notifications');
  });

  test('skeleton rows show while it loads and no switch is drawn; when it does not load, Try again and Back to profile', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    api.on('GET', '/api/preferences', async () => {
      await gate;
      return fail ? { abort: true } : { json: GRACE_PREFERENCES };
    });
    const preferences = new PreferencesPage(page);

    await preferences.open();

    await expect(preferences.loading).toContainText('Loading your preferences');
    await expect(preferences.skeletons.first()).toBeVisible();
    await expect(preferences.switches).toHaveCount(0);
    release();
    await expect(preferences.error).toContainText("Your preferences didn't load");
    await expect(preferences.backToProfile).toHaveAttribute('href', '/profile');
    fail = false;
    await preferences.tryAgainButton.click();
    await expect(preferences.switches).toHaveCount(11);
  });

  // L2-064 AC12: at XS the section list is hidden, each switch keeps a 44 px target and the save
  // bar sits above the tab bar.
  test('on a phone the section list is hidden, switches keep their target and the save bar clears the tab bar', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    answerPreferences(api);
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await expect(preferences.switches).toHaveCount(11);
    await expect(preferences.sectionNav).toBeHidden();
    expect(await preferences.smallestSwitchTarget()).toBeGreaterThanOrEqual(44);
    await preferences.switch('Messages').uncheck();
    await expect(preferences.saveBarText).toHaveText('Unsaved changes');
    expect(await preferences.saveBarClearsTabBar()).toBe(true);
  });
});

// L2-065 AC1, AC6 and AC8 (journey 34): who sees the member, who may message them, their area and
// their interests, changed and saved with the rest of the page.
test.describe('Member app, Preferences: privacy and suggestions', () => {
  test('shows who can see the profile, the three switches, the area and the interests with a check mark on each one on', async ({
    page,
    api,
  }) => {
    answerPreferences(api);
    const preferences = new PreferencesPage(page);

    await preferences.open();

    await expect(preferences.visibilityChoice('Members')).toBeChecked();
    await expect(preferences.visibilityChoice('Anyone')).not.toBeChecked();
    await expect(preferences.visibilityChoice('Just my groups')).not.toBeChecked();
    expect(await preferences.switchValues(preferences.privacy)).toEqual([
      ['Show my home church', false],
      ['Show me on attendee lists', true],
      ['Let anyone message me', false],
    ]);
    await expect(preferences.area).toHaveValue('scarborough');
    expect(
      (await preferences.area.locator('option').allTextContents()).map((o) => o.trim()),
    ).toEqual([
      'Choose your area',
      'Toronto East',
      'Toronto West',
      'Downtown Toronto',
      'Scarborough',
      'North York',
      'Mississauga',
      'Brampton',
      'Durham',
    ]);
    // Pressed is said by the attribute and shown by a check mark as well as colour (AC6).
    expect(await preferences.interestValues()).toEqual([
      ['Running', true, true],
      ['Strength', true, true],
      ['Basketball', true, true],
      ['Walking groups', false, false],
      ['Mobility', false, false],
      ['Nutrition', true, true],
      ['Cycling', false, false],
      ['Retreats', false, false],
      ['Pickleball', false, false],
    ]);
  });

  test('a privacy or suggestion change uses the save bar and is saved with the rest', async ({
    page,
    api,
  }) => {
    const saves = answerPreferences(api);
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await preferences.visibilityChoice('Just my groups').check();
    await preferences.switch('Let anyone message me').check();
    await preferences.area.selectOption('durham');
    await preferences.interest('Cycling').click();
    await preferences.interest('Running').click();

    await expect(preferences.saveBarText).toHaveText('Unsaved changes');
    await expect(preferences.interest('Cycling')).toHaveAttribute('aria-pressed', 'true');
    await preferences.saveButton.click();
    await expect(preferences.saveBarText).toHaveText('Preferences saved');
    expect(saves).toEqual([
      {
        email: GRACE_PREFERENCES.email,
        notifications: GRACE_PREFERENCES.notifications,
        privacy: { ...GRACE_PREFERENCES.privacy, visibility: 'groups', letAnyoneMessage: true },
        // The interests keep the order the screen lists them in.
        suggestions: {
          area: 'durham',
          interests: ['strength', 'basketball', 'nutrition', 'cycling'],
        },
      },
    ]);
    await expect(preferences.visibilityChoice('Just my groups')).toBeChecked();
  });

  test('a member with no area yet is asked to choose one, and choosing it is an unsaved change', async ({
    page,
    api,
  }) => {
    answerPreferences(api, {
      ...GRACE_PREFERENCES,
      suggestions: { area: null, interests: [] },
    });
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await expect(preferences.area).toHaveValue('');
    await expect(preferences.saveBar).toHaveCount(0);
    await preferences.area.selectOption('mississauga');
    await expect(preferences.saveBarText).toHaveText('Unsaved changes');
  });
});
