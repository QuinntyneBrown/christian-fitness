import { expect, test, type ApiHandlers } from '../fixtures/test';
import { answerPreferences } from '../fixtures/preferences';
import { FULL_PROFILE, NEW_PROFILE, TODAY } from '../fixtures/profiles';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { PreferencesPage } from '../page-objects/web/preferences.page';
import { WebProfilePage } from '../page-objects/web/profile.page';
import { WebServerErrorPage } from '../page-objects/web/server-error.page';

/** Answers `GET /api/profile/me` with `profile`, and counts the requests. */
function answerProfile(api: ApiHandlers, profile: unknown): { count: number } {
  const asked = { count: 0 };
  api.on('GET', '/api/profile/me', () => {
    asked.count++;
    return { json: profile };
  });
  return asked;
}

// L2-005 AC1: a signed-in member opening Profile sees their name, initials avatar, city, join date,
// bio, home church, goals, interests and the events they are going to (ADR 0015).
test.describe('Member app, my profile', () => {
  // L2-005 AC1, L2-064 AC1 (journey 33): Preferences opens from the member's own profile, beside
  // Edit profile, as well as from the footer.
  test('Profile offers Preferences beside Edit profile, and it opens Preferences', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    answerPreferences(api);
    const profile = new WebProfilePage(page);
    const preferences = new PreferencesPage(page);

    await profile.open();

    await expect(profile.editButton).toBeVisible();
    await expect(profile.preferencesLink).toHaveAttribute('href', '/preferences');
    await profile.preferencesLink.click();

    await expect(page).toHaveURL('/preferences');
    await expect(preferences.heading).toHaveText('Preferences');
  });

  test('Profile shows every field of the member and the events they are going to', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect.poll(() => profile.title()).toBe('Profile · Christian Fitness');
    await expect(profile.avatar).toHaveText('GT');
    await expect(profile.avatar).toHaveAttribute('aria-hidden', 'true');
    await expect(profile.meta).toHaveText('Member since January 2026');
    await expect(profile.facts).toHaveText(['Grace Fellowship, Scarborough', 'Toronto, ON']);
    await expect(profile.bio).toHaveText(FULL_PROFILE.bio);
    await expect(profile.goals).toHaveText([
      'Half marathon in the fall',
      'Strength twice a week',
      'Sleep before 11',
    ]);
    // The interest keys read as the labels the member chose them by.
    await expect(profile.tags).toHaveText(['Running', 'Strength', 'Basketball', 'Nutrition']);
    await expect(profile.goingHeading).toHaveText('Going to');
    await expect(profile.goingItems).toHaveCount(2);
    expect(await profile.goingRows()).toEqual([
      {
        date: 'Sat, Apr 18',
        title: 'Easter Sunrise 5K',
        href: '/events/0190c0de-0000-7000-8000-00000000e001',
      },
      {
        date: 'Thu, Apr 30',
        title: "Women's Hoops & Devotion Night",
        href: '/events/0190c0de-0000-7000-8000-00000000e002',
      },
    ]);
    // An event without a picture shows its date and title alone.
    expect(await profile.goingImages()).toEqual([true, false]);
    await expect(profile.emptyTexts).toHaveCount(0);
  });

  test('a profile without a home church or city shows neither', async ({ page, api }) => {
    answerProfile(api, { ...FULL_PROFILE, homeChurch: null, city: null });
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(profile.meta).toHaveText('Member since January 2026');
    await expect(profile.facts).toHaveCount(0);
  });

  test('names, bio, goals, places and titles are shown as text, never as markup', async ({
    page,
    api,
  }) => {
    const markup = '<img src=x onerror="document.title=1">';
    answerProfile(api, {
      ...FULL_PROFILE,
      name: `Grace ${markup}`,
      bio: `Bio ${markup}`,
      homeChurch: `Church ${markup}`,
      city: `City ${markup}`,
      goals: [`Goal ${markup}`],
      upcomingEvents: [{ ...FULL_PROFILE.upcomingEvents[1], title: `Event ${markup}` }],
    });
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.heading).toHaveText(`Grace ${markup}`);
    await expect(profile.bio).toHaveText(`Bio ${markup}`);
    await expect(profile.facts).toHaveText([`Church ${markup}`, `City ${markup}`]);
    await expect(profile.goals).toHaveText([`Goal ${markup}`]);
    expect((await profile.goingRows())[0].title).toBe(`Event ${markup}`);
    await expect(profile.images('x')).toHaveCount(0);
  });
});

// L2-023 AC2 (ADR 0035): an event staff cancelled stays in "Going to", marked cancelled, and no
// longer opens (the event is not published, so its page is not found).
test.describe('Member app, a cancelled event on my profile', () => {
  test('Going to marks the cancelled event and leaves the others as links', async ({
    page,
    api,
  }) => {
    const [sunrise, hoops] = FULL_PROFILE.upcomingEvents;
    answerProfile(api, {
      ...FULL_PROFILE,
      upcomingEvents: [sunrise, { ...hoops, cancelled: true }],
    });
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.goingItems).toHaveCount(2);
    await expect(profile.cancelledBadges).toHaveText(['Cancelled']);
    expect(await profile.goingRows()).toEqual([
      {
        date: 'Sat, Apr 18',
        title: 'Easter Sunrise 5K',
        href: '/events/0190c0de-0000-7000-8000-00000000e001',
      },
      { date: 'Thu, Apr 30', title: "Women's Hoops & Devotion Night", href: null },
    ]);
  });
});

// L2-005 AC2: a member going to nothing sees an empty state with a link to Events; every other
// empty section says what goes there (mock `profile/empty`).
test.describe('Member app, a new profile', () => {
  test('each empty section says what goes there, and Going to links to Events', async ({
    page,
    api,
  }) => {
    // Only the date is fixed; timers run, so the app renders as usual.
    await page.clock.setFixedTime(TODAY);
    answerProfile(api, NEW_PROFILE);
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(profile.avatar).toHaveText('GT');
    await expect(profile.meta).toHaveText('Member since today');
    await expect(profile.facts).toHaveCount(0);
    await expect(profile.emptyTexts).toHaveText([
      'Add a short bio so people at events know who you are.',
      'What are you working toward this year? Goals you add show here.',
      'No interests yet.',
      'Not going to anything yet.',
    ]);
    await expect(profile.bio).toHaveCount(0);
    await expect(profile.goals).toHaveCount(0);
    await expect(profile.tags).toHaveCount(0);
    await expect(profile.goingItems).toHaveCount(0);
    await expect(profile.goingEmpty).toHaveText(/Not going to anything yet\./);
    await expect(profile.browseEventsLink).toHaveAttribute('href', '/events');
  });

  test('interests the app does not know are left out, not shown as keys', async ({ page, api }) => {
    answerProfile(api, { ...FULL_PROFILE, interests: ['running', 'parkour'] });
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.tags).toHaveText(['Running']);
  });
});

// The mock's loading and error states; a 5xx is the server-error screen's (L2-043 AC4, AC5).
test.describe('Member app, while my profile loads or fails', () => {
  test('while the profile loads, skeletons show and say so; then the profile replaces them', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('GET', '/api/profile/me', async () => {
      await answered;
      return { json: FULL_PROFILE };
    });
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.loadingHeading).toBeAttached();
    await expect(profile.loading).toHaveAttribute('aria-live', 'polite');
    await expect(profile.skeletons.first()).toBeVisible();
    await expect(profile.heading).toHaveText('Loading profile');

    answer();

    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(profile.loading).toHaveCount(0);
  });

  test('a profile that does not load says so, and Try again asks again in place', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/profile/me', () =>
      fail
        ? {
            status: 404,
            headers: { 'content-type': 'application/problem+json' },
            json: { status: 404, code: 'not_found' },
          }
        : { json: FULL_PROFILE },
    );
    const profile = new WebProfilePage(page);

    await profile.open();

    await expect(profile.heading).toHaveText('Profile');
    await expect(profile.error).toHaveAttribute('role', 'alert');
    await expect(profile.errorTitle).toHaveText("Your profile didn't load");
    await expect(profile.errorText).toHaveText(
      "We couldn't reach Christian Fitness. Check your connection and try again.",
    );
    await expect(profile.backHomeLink).toHaveAttribute('href', '/home');
    await expect(profile.tryAgainButton).toBeEnabled();

    fail = false;
    await profile.tryAgainAndAwaitAnswer();

    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(profile.error).toHaveCount(0);
    expect(profile.location()).toBe('/profile');
  });

  test('a server error shows the server-error screen and keeps the address', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/profile/me', () => ({
      status: 503,
      headers: { 'content-type': 'application/problem+json' },
      json: { status: 503, code: 'server_error', reference: 'CF-4BF92F35' },
    }));
    const profile = new WebProfilePage(page);
    const serverError = new WebServerErrorPage(page);

    await profile.open();

    await expect(serverError.heading).toHaveText('Something went wrong');
    await expect(profile.error).toHaveCount(0);
    expect(serverError.location()).toBe('/profile');
  });
});

// L2-008 AC1 for Profile: the header's avatar opens it and marks it current.
test.describe('Member app, the profile avatar', () => {
  test('the avatar shows the member’s initials and is current on Profile only', async ({
    page,
    api,
  }) => {
    answerProfile(api, FULL_PROFILE);
    const home = new WebHomePage(page);
    const profile = new WebProfilePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(shell.profileButton).toHaveText('GT');
    await expect(shell.profileButton).toHaveAttribute('href', '/profile');
    await expect(shell.profileButton).not.toHaveAttribute('aria-current');

    await profile.open();
    await expect(profile.heading).toHaveText('Grace Thompson');
    await expect(shell.profileButton).toHaveAttribute('aria-current', 'page');
  });

  test('choosing the avatar on Home opens Profile without reloading the page', async ({
    page,
    api,
  }) => {
    const asked = answerProfile(api, FULL_PROFILE);
    const home = new WebHomePage(page);
    const profile = new WebProfilePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(home.greeting).toHaveText('Welcome, Grace');
    await expect(shell.profileButton).toHaveText('GT');
    await shell.markDocument();
    await shell.openProfile();

    await expect(profile.heading).toHaveText('Grace Thompson');
    expect(profile.location()).toBe('/profile');
    await expect(shell.profileButton).toHaveAttribute('aria-current', 'page');
    expect(await shell.isSameDocument()).toBe(true);
    expect(asked.count).toBe(1);
  });

  test('a member opens Profile with the keyboard alone', async ({ page, api }) => {
    answerProfile(api, FULL_PROFILE);
    const home = new WebHomePage(page);
    const profile = new WebProfilePage(page);
    const shell = new WebMemberShell(page);

    await home.open();
    await expect(shell.profileButton).toHaveText('GT');
    await shell.openProfileByKeyboard();

    await expect(profile.heading).toHaveText('Grace Thompson');
  });
});
