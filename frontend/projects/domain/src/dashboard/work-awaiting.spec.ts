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
const NOW = new Date('2026-04-15T12:45:00Z');

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
    expect(awaitingRowsOf(ADMIN, NOW)).toEqual([
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
    const rows = awaitingRowsOf(
      {
        flaggedMembers: ADMIN.flaggedMembers,
        suggestions: NO_SUGGESTIONS,
      },
      NOW,
    );

    expect(rows.map((r) => r.id)).toEqual(['member-m1', 'member-m2']);
  });

  it('puts the waiting suggestions first as one line naming them, with Check opening Listings', () => {
    expect(awaitingRowsOf(SUGGESTED, NOW)[0]).toEqual({
      id: 'suggestions',
      title: '4 listings suggested by members',
      meta: 'Rooted Physio, <b>Coach</b>, Eastside Lifters',
      href: '/listings',
      action: 'Check',
    });
    expect(awaitingRowsOf(SUGGESTED, NOW).map((r) => r.id)).toEqual([
      'suggestions',
      'application-a1',
      'member-m1',
      'member-m2',
    ]);
  });

  it('words one suggestion as one', () => {
    const one = { total: 1, items: [{ id: 's1', name: 'Rooted Physio' }] };

    expect(awaitingRowsOf({ ...ADMIN, suggestions: one }, NOW)[0]?.title).toBe(
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

// Journey 22 (ADR 0097), mock admin-dashboard/default: each story In review first, opened in the editor.
describe('awaitingRowsOf, stories in review', () => {
  const WITH_STORIES: WorkAwaitingStaffDto = {
    ...ADMIN,
    stories: {
      total: 5,
      items: [
        {
          id: 'st 1',
          headline: 'Fasting',
          author: 'Priya Raman',
          submittedAt: '2026-04-15T11:45:00Z',
        },
        { id: 'st2', headline: '<b>Bold</b>', author: null, submittedAt: '2026-04-14T15:00:00Z' },
      ],
    },
  };

  it('puts each story first with its byline and when it was submitted', () => {
    expect(awaitingRowsOf(WITH_STORIES, NOW).slice(0, 3)).toEqual([
      {
        id: 'story-st 1',
        title: '“Fasting” is ready for review',
        meta: 'Priya Raman · Submitted 1 hour ago',
        href: '/stories/st%201',
        action: 'Review',
      },
      {
        id: 'story-st2',
        title: '“<b>Bold</b>” is ready for review',
        meta: 'Submitted yesterday',
        href: '/stories/st2',
        action: 'Review',
      },
      expect.objectContaining({ id: 'application-a1' }),
    ]);
  });

  it('counts every story and links to all of them when more wait than are named', () => {
    expect(awaitingTotalOf(WITH_STORIES)).toBe(12);
    expect(awaitingMoreOf(WITH_STORIES)[0]).toEqual({
      label: 'All 5 stories in review',
      href: '/stories?status=review',
    });
  });
});

// L2-070 AC8: an issue still a Draft when its time passed is named first, while it can still go out today.
describe('awaitingRowsOf, a missed issue', () => {
  const MISSED: WorkAwaitingStaffDto = {
    ...ADMIN,
    missedIssue: { number: 49, wasDueAt: '2026-04-18T11:00:00+00:00' },
  };

  it('says the issue was not scheduled, first, and opens Newsletter', () => {
    expect(awaitingRowsOf(MISSED, NOW)[0]).toEqual({
      id: 'missed-issue',
      title: 'Issue #49 was not scheduled',
      meta: 'It was due Apr 18 at 7:00 AM Eastern. It can still go out later today.',
      href: '/newsletter',
      action: 'Review',
    });
    expect(awaitingRowsOf(ADMIN, NOW).some((row) => row.id === 'missed-issue')).toBe(false);
  });

  it('counts the missed issue as one thing waiting', () => {
    expect(awaitingTotalOf(MISSED)).toBe(awaitingTotalOf(ADMIN) + 1);
  });
});
