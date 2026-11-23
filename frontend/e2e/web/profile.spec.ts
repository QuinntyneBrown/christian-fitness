import { expect, test, type ApiHandlers } from '../fixtures/test';
import { FULL_PROFILE } from '../fixtures/profiles';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebMemberShell } from '../page-objects/web/member-shell.page';
import { WebProfilePage } from '../page-objects/web/profile.page';

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
// bio, home church, goals, interests and the events they are going to (ADR 0013).
test.describe('Member app, my profile', () => {
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
