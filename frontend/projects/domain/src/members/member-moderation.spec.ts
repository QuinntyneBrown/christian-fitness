import {
  moderationActionsOf,
  moderationProblems,
  moderationProblemsHeading,
  moderationRefusalMessage,
  moderationRefusalOf,
  moderationSubmitLabel,
  moderationTitle,
  moderationToast,
} from './member-moderation';

const NOTE = { field: 'note', text: 'Write a note so other staff know why' };
const LONG = { field: 'note', text: 'Use 500 characters or fewer' };
const CONFIRM = { field: 'confirmed', text: 'Confirm that Priya Nair should be suspended' };

// L2-029 (ADR 0028): the same table as the domain's Member, read from the screen's side.
describe('moderationActionsOf', () => {
  it.each([
    { status: 'active' as const, expected: ['flag', 'suspend'] },
    { status: 'flagged' as const, expected: ['suspend'] },
    { status: 'suspended' as const, expected: [] },
  ])('$status allows $expected', ({ status, expected }) => {
    expect(moderationActionsOf(status)).toEqual(expected);
  });
});

describe('moderationTitle', () => {
  it.each([
    { why: 'a choice to make', status: 'active' as const, expected: 'Moderate Priya Nair' },
    { why: 'only suspension left', status: 'flagged' as const, expected: 'Suspend Priya Nair' },
  ])('$why: $expected', ({ status, expected }) => {
    expect(moderationTitle('Priya Nair', status)).toBe(expected);
  });
});

describe('moderationSubmitLabel', () => {
  it.each([
    { action: 'flag' as const, expected: 'Flag member' },
    { action: 'suspend' as const, expected: 'Suspend member' },
  ])('$action is "$expected"', ({ action, expected }) => {
    expect(moderationSubmitLabel(action)).toBe(expected);
  });
});

// L2-029 AC5: what the dialog names before anything is sent.
describe('moderationProblems', () => {
  it.each([
    {
      why: 'a flag with a note',
      action: 'flag' as const,
      note: 'Spam',
      confirmed: false,
      expected: [],
    },
    {
      why: 'a flag with no note',
      action: 'flag' as const,
      note: '',
      confirmed: false,
      expected: [NOTE],
    },
    {
      why: 'a flag with a note of spaces',
      action: 'flag' as const,
      note: '   ',
      confirmed: false,
      expected: [NOTE],
    },
    {
      why: 'a flag needs no confirmation',
      action: 'flag' as const,
      note: 'Spam',
      confirmed: false,
      expected: [],
    },
    {
      why: 'a note of 500',
      action: 'flag' as const,
      note: 'n'.repeat(500),
      confirmed: false,
      expected: [],
    },
    {
      why: 'a note of 500 once trimmed',
      action: 'flag' as const,
      note: ` ${'n'.repeat(500)}  `,
      confirmed: false,
      expected: [],
    },
    {
      why: 'a note of 501',
      action: 'flag' as const,
      note: 'n'.repeat(501),
      confirmed: false,
      expected: [LONG],
    },
    {
      why: 'a confirmed suspension with a note',
      action: 'suspend' as const,
      note: 'Spam',
      confirmed: true,
      expected: [],
    },
    {
      why: 'a suspension not confirmed',
      action: 'suspend' as const,
      note: 'Spam',
      confirmed: false,
      expected: [CONFIRM],
    },
    {
      why: 'a suspension with nothing',
      action: 'suspend' as const,
      note: '',
      confirmed: false,
      expected: [NOTE, CONFIRM],
    },
    {
      why: 'a confirmed suspension with no note',
      action: 'suspend' as const,
      note: ' ',
      confirmed: true,
      expected: [NOTE],
    },
    {
      why: 'a long note and no confirmation',
      action: 'suspend' as const,
      note: 'n'.repeat(501),
      confirmed: false,
      expected: [LONG, CONFIRM],
    },
  ])('$why', ({ action, note, confirmed, expected }) => {
    expect(moderationProblems(action, note, confirmed, 'Priya Nair')).toEqual(expected);
  });
});

describe('moderationProblemsHeading', () => {
  it.each([
    { count: 1, expected: '1 thing to fix' },
    { count: 2, expected: '2 things to fix' },
  ])('$count is "$expected"', ({ count, expected }) => {
    expect(moderationProblemsHeading(count)).toBe(expected);
  });
});

// A refusal is its status and its code together (L2-032).
describe('moderationRefusalOf', () => {
  it.each([
    {
      why: "staff's own account",
      error: { status: 403, code: 'cannot_moderate_self' },
      expected: 'self',
    },
    {
      why: 'a Moderator moderating staff',
      error: { status: 403, code: 'forbidden_role' },
      expected: 'role',
    },
    {
      why: 'a status that moved',
      error: { status: 409, code: 'status_conflict' },
      expected: 'changed',
    },
    {
      why: 'a member who is gone',
      error: { status: 404, code: 'member_not_found' },
      expected: 'changed',
    },
    {
      why: 'a 403 with another code',
      error: { status: 403, code: 'forbidden' },
      expected: 'failed',
    },
    {
      why: 'the right code on the wrong status',
      error: { status: 500, code: 'cannot_moderate_self' },
      expected: 'failed',
    },
    {
      why: 'a conflict code on a 404',
      error: { status: 404, code: 'status_conflict' },
      expected: 'failed',
    },
    {
      why: 'a 404 with no member code',
      error: { status: 404, code: 'not_found' },
      expected: 'failed',
    },
    {
      why: 'a refused body',
      error: { status: 400, code: 'validation_failed' },
      expected: 'failed',
    },
    { why: 'a server error', error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { why: 'no answer', error: { status: 0, code: 'network' }, expected: 'failed' },
    { why: 'not an error at all', error: null, expected: 'failed' },
  ])('$why is $expected', ({ error, expected }) => {
    expect(moderationRefusalOf(error)).toBe(expected);
  });
});

describe('moderationRefusalMessage', () => {
  it.each([
    { refusal: 'self' as const, heading: "You can't flag or suspend your own account" },
    { refusal: 'role' as const, heading: 'Only an Admin can flag or suspend staff' },
    { refusal: 'changed' as const, heading: 'This member has changed' },
    { refusal: 'failed' as const, heading: "Couldn't save the change" },
  ])('$refusal is "$heading"', ({ refusal, heading }) => {
    expect(moderationRefusalMessage(refusal).heading).toBe(heading);
    expect(moderationRefusalMessage(refusal).text.length).toBeGreaterThan(0);
  });
});

describe('moderationToast', () => {
  it('says a flagged member can still use the app', () => {
    expect(moderationToast('flag', 'Priya Nair')).toEqual({
      title: 'Priya Nair flagged',
      text: 'They can still use the app. Your note is on their row.',
    });
  });

  it('says a suspended member is signed out', () => {
    expect(moderationToast('suspend', 'Priya Nair')).toEqual({
      title: 'Priya Nair suspended',
      text: 'They are signed out everywhere and cannot sign in.',
    });
  });
});
