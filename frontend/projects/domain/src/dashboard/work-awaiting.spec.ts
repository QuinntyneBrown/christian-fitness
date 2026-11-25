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
  suggestions: { total: 0, items: [] },
};

const NO_SUGGESTIONS = ADMIN.suggestions;

const SUGGESTED: WorkAwaitingStaffDto = {
  ...ADMIN,
  suggestions: {
    total: 4,
    items: [
      { id: 's1', name: 'Rooted Physio' },
      { id: 's2', name: '<b>Coach</b>' },
      { id: 's3', name: 'Eastside Lifters' },
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
        action: 'Review',
      },
      {
        id: 'member-m1',
        title: 'Kevin was flagged',
        meta: 'Promoting supplements',
        href: '/members?status=flagged',
        action: 'Review',
      },
      {
        id: 'member-m2',
        title: 'Priya was flagged',
        meta: 'No note',
        href: '/members?status=flagged',
        action: 'Review',
      },
    ]);
  });

  it('has no application row when the answer has no applications (a Moderator)', () => {
    const rows = awaitingRowsOf({
      flaggedMembers: ADMIN.flaggedMembers,
      suggestions: NO_SUGGESTIONS,
    });

    expect(rows.map((r) => r.id)).toEqual(['member-m1', 'member-m2']);
  });

  it('puts the waiting suggestions first as one line naming them, with Check opening Listings', () => {
    expect(awaitingRowsOf(SUGGESTED)[0]).toEqual({
      id: 'suggestions',
      title: '4 listings suggested by members',
      meta: 'Rooted Physio, <b>Coach</b>, Eastside Lifters',
      href: '/listings',
      action: 'Check',
    });
    expect(awaitingRowsOf(SUGGESTED).map((r) => r.id)).toEqual([
      'suggestions',
      'application-a1',
      'member-m1',
      'member-m2',
    ]);
  });

  it('words one suggestion as one', () => {
    const one = { total: 1, items: [{ id: 's1', name: 'Rooted Physio' }] };

    expect(awaitingRowsOf({ ...ADMIN, suggestions: one })[0]?.title).toBe(
      '1 listing suggested by a member',
    );
  });
});

describe('awaitingTotalOf', () => {
  it('adds applications and flagged members, and counts only flagged for a Moderator', () => {
    expect(awaitingTotalOf(ADMIN)).toBe(7);
    expect(
      awaitingTotalOf({ flaggedMembers: ADMIN.flaggedMembers, suggestions: NO_SUGGESTIONS }),
    ).toBe(2);
  });

  it('counts each suggestion waiting', () => {
    expect(awaitingTotalOf(SUGGESTED)).toBe(11);
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
        suggestions: NO_SUGGESTIONS,
      }),
    ).toEqual([{ label: 'All 4 flagged members', href: '/members?status=flagged' }]);
  });
});

describe('seesApplications', () => {
  it('is false when the answer carries no applications', () => {
    expect(seesApplications(ADMIN)).toBe(true);
    expect(
      seesApplications({ flaggedMembers: ADMIN.flaggedMembers, suggestions: NO_SUGGESTIONS }),
    ).toBe(false);
  });
});
