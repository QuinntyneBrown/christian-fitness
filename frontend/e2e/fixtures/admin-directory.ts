/** One suggestion in `GET /api/admin/directory/suggestions` (ADR 0090). */
export interface SuggestionSummaryFixture {
  id: string;
  name: string;
  kind: string;
  area: string;
  from: string | null;
  submittedAt: string;
  status: 'waiting' | 'approved' | 'declined';
}

/** One suggestion as `GET /api/admin/directory/suggestions/{id}` answers it (ADR 0090). */
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

/** `GET /api/admin/counts` with nothing waiting: the fixture's default answer (ADR 0090). */
export const NO_COUNTS = { suggestions: 0 };

/** A published listing as `GET /api/admin/directory/listings` answers it (ADR 0090). */
export interface ListedListingFixture {
  id: string;
  kind: string;
  name: string;
  area: string;
  tagline: string;
  about: string;
  website: string | null;
  photoKey: string | null;
  verified: boolean;
  followers: number;
}

/** Listed in name order (mock `admin-listings/listed`: some of its rows, and the unverified one). */
export const CAST_LISTED: ListedListingFixture[] = [
  {
    id: '0193a9c0-1000-7000-8000-000000000001',
    kind: 'organization',
    name: 'Christian Fitness',
    area: 'Toronto-wide',
    tagline: 'A Christian community for health in body and spirit',
    about: 'Runs, workouts and retreats across the GTA.',
    website: 'https://christianfitness.ca',
    photoKey: null,
    verified: true,
    followers: 2140,
  },
  {
    id: '0193a9c0-1000-7000-8000-000000000002',
    kind: 'instructor',
    name: 'Danielle Okafor',
    area: 'East York',
    tagline: 'Strength coach for women',
    about: 'Certified strength coach.',
    website: null,
    photoKey: '0123456789abcdef0123456789abcdef.jpg',
    verified: true,
    followers: 935,
  },
  {
    id: '0193a9c0-1000-7000-8000-000000000003',
    kind: 'organization',
    name: 'Lakeshore Runners Fellowship',
    area: 'Etobicoke',
    tagline: 'Beginner-friendly running club with a prayer at every finish',
    about:
      'A west-end run club started by three neighbours in 2019. Our Couch to 5K program has graduated over 400 runners, most of whom swore they could never run.',
    website: 'https://lakeshorerunners.ca',
    photoKey: null,
    verified: true,
    followers: 612,
  },
  {
    id: '0193a9c0-1000-7000-8000-000000000004',
    kind: 'company',
    name: 'Northline Athletic',
    area: 'Roncesvalles',
    tagline: 'Running shoes fitted by people who run',
    about: 'A neighbourhood running shop.',
    website: null,
    photoKey: null,
    verified: false,
    followers: 256,
  },
];

/** A page of Listed with `listings`, of `total`, reading on from `next`. */
export function listedPage(
  listings: ListedListingFixture[],
  { total = listings.length, next = null }: { total?: number; next?: string | null } = {},
) {
  return { total, listings, next };
}
