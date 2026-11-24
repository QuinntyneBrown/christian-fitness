import type { WorkAwaitingStaffDto } from '@cf/api';
import { awaitingMoreOf, awaitingRowsOf, awaitingTotalOf, seesApplications } from './work-awaiting';

const ADMIN: WorkAwaitingStaffDto = {
  applications: {
    total: 5,
    items: [{ id: 'a1', name: 'Hannah', role: 'Coach', submittedAt: '2026-04-13T23:30:00+00:00' }],
  },
  flaggedMembers: {
    total: 2,
    items: [
      { id: 'm1', name: 'Kevin', note: '  Promoting supplements ' },
      { id: 'm2', name: 'Priya', note: null },
    ],
  },
};

describe('awaitingRowsOf', () => {
  it('lists applications then flagged members, each linked to its screen', () => {
    expect(awaitingRowsOf(ADMIN)).toEqual([
      {
        id: 'application-a1',
        title: 'Hannah applied to list services',
        meta: 'Coach · Apr 13',
        href: '/services',
      },
      {
        id: 'member-m1',
        title: 'Kevin was flagged',
        meta: 'Promoting supplements',
        href: '/members?status=flagged',
      },
      {
        id: 'member-m2',
        title: 'Priya was flagged',
        meta: 'No note',
        href: '/members?status=flagged',
      },
    ]);
  });

  it('has no application row when the answer has no applications (a Moderator)', () => {
    const rows = awaitingRowsOf({ flaggedMembers: ADMIN.flaggedMembers });

    expect(rows.map((r) => r.id)).toEqual(['member-m1', 'member-m2']);
  });
});

describe('awaitingTotalOf', () => {
  it('adds applications and flagged members, and counts only flagged for a Moderator', () => {
    expect(awaitingTotalOf(ADMIN)).toBe(7);
    expect(awaitingTotalOf({ flaggedMembers: ADMIN.flaggedMembers })).toBe(2);
  });
});

describe('awaitingMoreOf', () => {
  it('links to all of a list only when more wait than are named', () => {
    expect(awaitingMoreOf(ADMIN)).toEqual([
      { label: 'All 5 pending applications', href: '/services' },
    ]);
    expect(
      awaitingMoreOf({
        applications: { total: 1, items: ADMIN.applications!.items },
        flaggedMembers: { total: 4, items: ADMIN.flaggedMembers.items },
      }),
    ).toEqual([{ label: 'All 4 flagged members', href: '/members?status=flagged' }]);
  });
});

describe('seesApplications', () => {
  it('is false when the answer carries no applications', () => {
    expect(seesApplications(ADMIN)).toBe(true);
    expect(seesApplications({ flaggedMembers: ADMIN.flaggedMembers })).toBe(false);
  });
});
