import type { SuggestionDetailDto, SuggestionSummaryDto } from '@cf/api';
import {
  claimResendable,
  decisionResult,
  decisionTag,
  kindLabel,
  passedCount,
  passedLine,
  suggestionAge,
  suggestionByLine,
  suggestionFromLine,
  suggestionKindAndArea,
  type SuggestionClaim,
  suggestionDeclineFailure,
  suggestionDeclineProblem,
  reviewRefusalOf,
  websiteLabel,
} from './suggestion-review';

const NOW = new Date('2026-11-25T15:00:00Z');

const SUMMARY: SuggestionSummaryDto = {
  id: 's1',
  name: 'Eastside Ladies Who Lift',
  kind: 'organization',
  area: 'Danforth & Pape',
  from: 'Adaeze Kalu',
  submittedAt: '2026-11-25T11:00:00Z',
  status: 'waiting',
};

const DETAIL: SuggestionDetailDto = {
  id: 's1',
  kind: 'company',
  name: 'Rooted Physio',
  area: 'Leslieville',
  website: null,
  reason: null,
  relation: 'someone-i-know',
  from: 'Jordan Reid',
  submittedAt: '2026-11-22T15:00:00Z',
  status: 'waiting',
  checks: [],
  claim: null,
};

// L2-073 AC2 (ADR 0090): each card says the kind, the area, who sent it and when.
describe('suggestion cards', () => {
  it.each<{ why: string; submittedAt: string; expected: string }>([
    { why: 'hours ago', submittedAt: '2026-11-25T11:00:00Z', expected: '4 hours ago' },
    {
      why: 'one day ago reads Yesterday',
      submittedAt: '2026-11-24T13:00:00Z',
      expected: 'Yesterday',
    },
    { why: 'days ago', submittedAt: '2026-11-22T15:00:00Z', expected: '3 days ago' },
  ])('$why', ({ submittedAt, expected }) => {
    expect(suggestionAge(submittedAt, NOW)).toBe(expected);
  });

  it('names the kind by its singular name and the area', () => {
    expect(suggestionKindAndArea(SUMMARY)).toBe('Organization · Danforth & Pape');
    expect(kindLabel('church-ministry')).toBe('Church Ministry');
  });

  it('says who sent it, or that it was self-submitted', () => {
    expect(suggestionFromLine(SUMMARY, NOW)).toBe('From Adaeze Kalu · 4 hours ago');
    expect(suggestionFromLine({ ...SUMMARY, from: null }, NOW)).toBe(
      'Self-submitted · 4 hours ago',
    );
  });
});

// L2-073 AC6, AC8, AC9 (ADR 0090): what a decided suggestion says.
describe('a decided suggestion', () => {
  it.each<{ status: 'approved' | 'declined'; claim: SuggestionClaim | null; expected: string }>([
    {
      status: 'approved',
      claim: 'email',
      expected: 'Approved. We’ve sent them a link to claim and publish their listing.',
    },
    {
      status: 'approved',
      claim: 'message',
      expected: 'Approved. We’ve sent them a link to claim and publish their listing.',
    },
    {
      status: 'approved',
      claim: 'staff-managed',
      expected: 'Approved. It’s in the directory now, managed by our team.',
    },
    { status: 'approved', claim: null, expected: 'Approved.' },
    {
      status: 'approved',
      claim: 'sent',
      expected: 'Approved. We’ve sent them a link to claim and publish their listing.',
    },
    {
      status: 'approved',
      claim: 'expired',
      expected: 'Approved. We’ve sent them a link to claim and publish their listing.',
    },
    {
      status: 'approved',
      claim: 'declined',
      expected: 'Approved. They said this listing isn’t them, so it wasn’t published.',
    },
    { status: 'approved', claim: 'claimed', expected: 'Approved.' },
    {
      status: 'declined',
      claim: null,
      expected: 'Declined. The person who suggested it has been told.',
    },
  ])('$status with claim $claim reads "$expected"', ({ status, claim, expected }) => {
    expect(decisionResult(status, claim)).toBe(expected);
  });

  // L2-078 AC8 (ADR 0091): Send a new link while a link is out, open or expired.
  it.each<{ claim: SuggestionClaim | null; expected: boolean }>([
    { claim: 'email', expected: true },
    { claim: 'message', expected: true },
    { claim: 'sent', expected: true },
    { claim: 'expired', expected: true },
    { claim: 'claimed', expected: false },
    { claim: 'declined', expected: false },
    { claim: 'staff-managed', expected: false },
    { claim: null, expected: false },
  ])('a claim $claim offers a new link: $expected', ({ claim, expected }) => {
    expect(claimResendable(claim)).toBe(expected);
  });

  it.each<{ why: string; error: unknown; expected: 'decided' | 'failed' }>([
    {
      why: 'decided first',
      error: { status: 409, code: 'suggestion_decided' },
      expected: 'decided',
    },
    { why: 'gone', error: { status: 404, code: 'suggestion_not_found' }, expected: 'decided' },
    {
      why: 'too few checks',
      error: { status: 409, code: 'checks_incomplete' },
      expected: 'failed',
    },
    { why: 'no answer', error: { status: 0, code: 'network' }, expected: 'failed' },
    { why: 'not an API error', error: new Error('x'), expected: 'failed' },
  ])('a refusal $why is $expected', ({ error, expected }) => {
    expect(reviewRefusalOf(error)).toBe(expected);
  });

  it.each([
    ['waiting', undefined],
    ['approved', 'Approved'],
    ['declined', 'Declined'],
  ] as const)('a %s card is tagged %s', (status, tag) => {
    expect(decisionTag(status)).toBe(tag);
  });
});

// L2-073 AC8 (ADR 0090; mocks decline-suggestion/invalid, failed and refused).
describe('declining a suggestion', () => {
  it.each<{ why: string; reason: string; expected: string | null }>([
    { why: 'none', reason: '', expected: null },
    { why: 'only spaces', reason: '   ', expected: null },
    { why: '500 characters', reason: 'a'.repeat(500), expected: null },
    { why: '500 characters and spaces', reason: ` ${'a'.repeat(500)} `, expected: null },
    { why: '501 characters', reason: 'a'.repeat(501), expected: 'Use 500 characters or fewer' },
  ])('a reason of $why is $expected', ({ reason, expected }) => {
    expect(suggestionDeclineProblem(reason)).toBe(expected);
  });

  it.each([
    [
      'decided' as const,
      'This suggestion was already decided',
      'Someone else approved or declined it. Close this to see it as it is now.',
    ],
    [
      'failed' as const,
      "Couldn't decline the suggestion",
      "The server didn't respond. Nothing was lost; try again.",
    ],
  ])('a %s decline reads "%s"', (refusal, heading, text) => {
    expect(suggestionDeclineFailure(refusal)).toEqual({ heading, text });
  });
});

// L2-073 AC3: who sent it and how they know them, the website and the checks passed.
describe('the chosen suggestion', () => {
  it.each<{ relation: SuggestionDetailDto['relation']; from: string | null; expected: string }>([
    { relation: 'myself', from: null, expected: 'Submitted by the listing themselves' },
    { relation: 'someone-i-know', from: 'Jordan Reid', expected: 'Jordan Reid · knows them' },
    { relation: 'somewhere-ive-been', from: 'Adaeze Kalu', expected: 'Adaeze Kalu · attended' },
    { relation: 'someone-i-know', from: null, expected: 'A member · knows them' },
  ])('$relation from $from reads "$expected"', ({ relation, from, expected }) => {
    expect(suggestionByLine({ ...DETAIL, relation, from })).toBe(expected);
  });

  it.each([
    ['https://delaneyperformance.ca', 'delaneyperformance.ca'],
    ['https://instagram.com/eastsideladieslift/', 'instagram.com/eastsideladieslift'],
    ['http://example.org/a', 'example.org/a'],
  ])('names %s as %s', (website, expected) => {
    expect(websiteLabel(website)).toBe(expected);
  });

  it('counts the passed checks among the four, ignoring any it does not know', () => {
    const checks = [
      { check: 'credentials' as const, passed: true },
      { check: 'insurance' as const, passed: false },
      { check: 'conversation' as const, passed: true },
    ];
    expect(passedCount(checks)).toBe(2);
    expect(passedLine(checks)).toBe('2 of 4 passed');
    expect(passedLine([])).toBe('0 of 4 passed');
  });
});
