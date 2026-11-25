/** One suggestion in `GET /api/admin/directory/suggestions` (ADR 0087). */
export interface SuggestionSummaryFixture {
  id: string;
  name: string;
  kind: string;
  area: string;
  from: string | null;
  submittedAt: string;
  status: 'waiting' | 'approved' | 'declined';
}

/** One suggestion as `GET /api/admin/directory/suggestions/{id}` answers it (ADR 0087). */
export interface SuggestionDetailFixture {
  id: string;
  kind: string;
  name: string;
  area: string;
  website: string | null;
  reason: string | null;
  relation: 'myself' | 'someone-i-know' | 'somewhere-ive-been';
  from: string | null;
  submittedAt: string;
  status: 'waiting' | 'approved' | 'declined';
  checks: { check: string; passed: boolean }[];
}

/** The mocks' "now" for Listings, so "4 hours ago" reads as it does there: Nov 25, 2026, 3 PM UTC. */
export const LISTINGS_NOW = new Date('2026-11-25T15:00:00Z');

/** The four checks, none passed, in the panel's order. */
export function checks(...passed: string[]): { check: string; passed: boolean }[] {
  return ['credentials', 'insurance', 'two-references', 'conversation'].map((check) => ({
    check,
    passed: passed.includes(check),
  }));
}

/** The cast of mock `admin-listings/default`, oldest first. */
export const CAST_SUGGESTIONS: SuggestionDetailFixture[] = [
  {
    id: '0193a9c1-0000-7000-8000-000000000001',
    kind: 'organization',
    name: 'Eastside Ladies Who Lift',
    area: 'Danforth & Pape',
    website: 'https://instagram.com/eastsideladieslift',
    reason:
      'Saturday morning strength group out of Danforth Baptist. About 25 women, coached by a CSEP trainer.',
    relation: 'somewhere-ive-been',
    from: 'Adaeze Kalu',
    submittedAt: '2026-11-25T11:00:00Z',
    status: 'waiting',
    checks: checks('credentials'),
  },
  {
    id: '0193a9c1-0000-7000-8000-000000000002',
    kind: 'instructor',
    name: 'Coach Marcus Delaney',
    area: 'Mississauga',
    website: 'https://delaneyperformance.ca',
    reason:
      'I run speed and agility for youth athletes and lead a men’s Bible study at Hope Church. Looking to list my Saturday clinics.',
    relation: 'myself',
    from: null,
    submittedAt: '2026-11-24T13:00:00Z',
    status: 'waiting',
    checks: checks('credentials', 'insurance', 'two-references'),
  },
  {
    id: '0193a9c1-0000-7000-8000-000000000003',
    kind: 'company',
    name: 'Rooted Physio',
    area: 'Leslieville',
    website: null,
    reason: null,
    relation: 'someone-i-know',
    from: 'Jordan Reid',
    submittedAt: '2026-11-22T15:00:00Z',
    status: 'waiting',
    checks: checks(),
  },
];

/** The summary row of a suggestion. */
export function summaryOf(detail: SuggestionDetailFixture): SuggestionSummaryFixture {
  return {
    id: detail.id,
    name: detail.name,
    kind: detail.kind,
    area: detail.area,
    from: detail.relation === 'myself' ? null : detail.from,
    submittedAt: detail.submittedAt,
    status: detail.status,
  };
}

/** The list answer for `suggestions`, with the waiting and listed counts. */
export function suggestionList(
  suggestions: SuggestionDetailFixture[],
  { listed = 12, next = null }: { listed?: number; next?: string | null } = {},
) {
  return {
    waiting: suggestions.filter((s) => s.status === 'waiting').length,
    listed,
    suggestions: suggestions.map(summaryOf),
    next,
  };
}

/** Nothing waiting and nothing listed: the fixture's default answer. */
export const NO_SUGGESTIONS = { waiting: 0, listed: 0, suggestions: [], next: null };

/** `GET /api/admin/counts` with nothing waiting: the fixture's default answer (ADR 0087). */
export const NO_COUNTS = { suggestions: 0 };
