import { expect, test } from '../fixtures/test';
import { WebMemberProfilePage } from '../page-objects/web/member-profile.page';

const MICHAEL = '0190c0de-0000-7000-8000-0000000000b1';
const GRACE = '0190c0de-0000-7000-8000-0000000000b2';
const markup = '<img src=x onerror="document.title=1">';

// L2-005 AC3: another member's profile shows only their public fields, and a home church only
// when its owner chose to show it (ADR 0038). The API answer carries no email or other key.
test.describe('Member app, another member profile', () => {
  test('shows name, initials, bio and interests, and a home church only when it is shown', async ({
    page,
    api,
  }) => {
    api.on('GET', `/api/members/${MICHAEL}/profile`, () => ({
      json: {
        name: 'Michael Chen',
        bio: `Weekend long-runner. ${markup}`,
        interests: ['running', 'cycling', 'strength'],
      },
    }));
    api.on('GET', `/api/members/${GRACE}/profile`, () => ({
      json: {
        name: 'Grace Thompson',
        bio: null,
        interests: [],
        homeChurch: 'Grace Fellowship, Scarborough',
      },
    }));
    const member = new WebMemberProfilePage(page);

    await member.open(MICHAEL);

    await expect(member.heading).toHaveText('Michael Chen');
    await expect.poll(() => member.title()).toBe('Member · Christian Fitness');
    await expect(member.avatar).toHaveText('MC');
    // The bio is text, never markup.
    await expect(member.bio).toHaveText(`Weekend long-runner. ${markup}`);
    await expect(member.tags).toHaveText(['Running', 'Cycling', 'Strength']);
    await expect(member.sectionHeadings).toHaveText(['About', 'Into']);
    await expect(member.facts).toHaveCount(0);

    await member.open(GRACE);

    await expect(member.heading).toHaveText('Grace Thompson');
    await expect(member.facts).toHaveText(['Grace Fellowship, Scarborough']);
  });

  // L2-065 AC5 (journey 34): a member who takes messages only from their groups says so, where
  // Message would have been, to a member who shares none with them.
  test('says when a member only takes messages from people in their groups, in place of Message', async ({
    page,
    api,
  }) => {
    api.on('GET', `/api/members/${MICHAEL}/profile`, () => ({
      json: { name: 'Michael Chen', bio: null, interests: [], messagesRestricted: true },
    }));
    api.on('GET', `/api/members/${GRACE}/profile`, () => ({
      json: { name: 'Grace Thompson', bio: null, interests: [] },
    }));
    const member = new WebMemberProfilePage(page);

    await member.open(MICHAEL);

    await expect(member.heading).toHaveText('Michael Chen');
    await expect(member.messagesNote).toHaveText(
      'Michael only takes messages from people in their groups.',
    );
    await expect(member.messageLink).toHaveCount(0);

    await member.open(GRACE);

    await expect(member.messageLink).toHaveAttribute('href', `/messages/${GRACE}`);
    await expect(member.messagesNote).toHaveCount(0);
  });

  test('a profile that does not load shows one generic message', async ({ page, api }) => {
    api.on('GET', `/api/members/${MICHAEL}/profile`, () => ({
      status: 404,
      json: { code: 'not_found' },
    }));
    const member = new WebMemberProfilePage(page);

    await member.open(MICHAEL);

    await expect(member.errorTitle).toHaveText("This profile didn't load");
  });
});
