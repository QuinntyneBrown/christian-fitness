import type { StaffRoleName } from '@cf/api';
import { adminNavOf, showsAreaGroups } from './admin-nav';

describe('adminNavOf', () => {
  it("lists the role's areas, with the suggestions waiting counted beside Listings", () => {
    expect(adminNavOf('Moderator', { suggestions: 3, storiesInReview: 0 })).toEqual([
      { key: 'dashboard', label: 'Dashboard', href: '/', group: null },
      { key: 'series', label: 'Event series', href: '/series', group: 'Gather' },
      { key: 'community-pick', label: 'Community Pick', href: '/community-pick', group: 'Gather' },
      {
        key: 'listings',
        label: 'Listings',
        href: '/listings',
        group: 'Community',
        count: 3,
        countLabel: '3 suggestions to check',
      },
      { key: 'members', label: 'Members', href: '/members', group: 'Community' },
    ]);
  });

  // L2-021 AC1 (ADR 0079, ADR 0091, ADR 0094): Dashboard alone, then each area in its group.
  it('gives an Admin Dashboard alone, then the Publish, Gather and Community areas', () => {
    expect(adminNavOf('Admin', null).map((area) => [area.label, area.group, area.href])).toEqual([
      ['Dashboard', null, '/'],
      ['Stories', 'Publish', '/stories'],
      ['Events', 'Gather', '/events'],
      ['Event series', 'Gather', '/series'],
      ['Community Pick', 'Gather', '/community-pick'],
      ['Listings', 'Community', '/listings'],
      ['Services', 'Community', '/services'],
      ['Members', 'Community', '/members'],
    ]);
  });

  it('words one suggestion as one', () => {
    const listings = adminNavOf('Admin', { suggestions: 1, storiesInReview: 0 }).find(
      (a) => a.key === 'listings',
    );

    expect(listings?.countLabel).toBe('1 suggestion to check');
  });

  // L2-068 AC5 (ADR 0097): Stories counts the stories in review, in words for assistive technology.
  it.each([
    [1, '1 story to review'],
    [4, '4 stories to review'],
  ])('counts %i stories in review beside Stories as "%s"', (waiting, label) => {
    const stories = adminNavOf('Admin', { suggestions: 0, storiesInReview: waiting }).find(
      (a) => a.key === 'stories',
    );

    expect([stories?.count, stories?.countLabel]).toEqual([waiting, label]);
  });

  it('shows no count when none waits or the counts did not load', () => {
    for (const counts of [{ suggestions: 0, storiesInReview: 0 }, null]) {
      expect(adminNavOf('Admin', counts).some((a) => 'count' in a)).toBe(false);
    }
  });
});

describe('showsAreaGroups', () => {
  it.each<{ role: StaffRoleName; shown: boolean }>([
    { role: 'Admin', shown: true },
    { role: 'Moderator', shown: false },
  ])('$role: $shown', ({ role, shown }) => {
    expect(showsAreaGroups(role)).toBe(shown);
  });
});
