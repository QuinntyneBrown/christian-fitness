import { adminNavOf } from './admin-nav';

describe('adminNavOf', () => {
  it("lists the role's areas, with the suggestions waiting counted beside Listings", () => {
    expect(adminNavOf('Moderator', { suggestions: 3 })).toEqual([
      { key: 'dashboard', label: 'Dashboard', href: '/' },
      {
        key: 'listings',
        label: 'Listings',
        href: '/listings',
        count: 3,
        countLabel: '3 suggestions to check',
      },
      { key: 'members', label: 'Members', href: '/members' },
    ]);
  });

  it('words one suggestion as one', () => {
    const listings = adminNavOf('Admin', { suggestions: 1 }).find((a) => a.key === 'listings');

    expect(listings?.countLabel).toBe('1 suggestion to check');
  });

  it('shows no count when none waits or the counts did not load', () => {
    for (const counts of [{ suggestions: 0 }, null]) {
      expect(adminNavOf('Admin', counts).some((a) => 'count' in a)).toBe(false);
    }
  });
});
