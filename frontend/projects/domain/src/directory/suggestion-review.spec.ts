import type { SuggestionDetailDto, SuggestionSummaryDto } from '@cf/api';
import {
  kindLabel,
  passedCount,
  passedLine,
  suggestionAge,
  suggestionByLine,
  suggestionFromLine,
  suggestionKindAndArea,
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
};

// L2-073 AC2 (ADR 0087): each card says the kind, the area, who sent it and when.
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
