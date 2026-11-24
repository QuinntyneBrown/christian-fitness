import type { ApiHandlers } from './api-handlers';

/** A listing as `GET /api/services` answers it (ADR 0050). */
export interface ServiceListingFixture {
  id: string;
  name: string;
  role: string;
  category: string;
  where: string;
  price: string;
  credentials: string;
  about: string;
  publishedAt: string;
}

/** What the fixture answers unless a spec says otherwise: nobody listed (mock `services/empty`). */
export const NO_SERVICES = { total: 0, services: [] };

/** The mock `services/default` cast, in the name order the API serves. */
export const DANIELLE: ServiceListingFixture = {
  id: '0190c0de-0000-7000-8000-0000000b0001',
  name: 'Danielle Okafor',
  role: 'Personal trainer',
  category: 'Training',
  where: 'In person · East York',
  price: 'From $70 / session',
  credentials: 'NSCA-CPT, 8 years coaching',
  about: 'Strength training for busy parents.',
  publishedAt: '2026-02-10T15:00:00Z',
};

/** The mock `services/selected` listing: published March 2026. */
export const MARCUS: ServiceListingFixture = {
  id: '0190c0de-0000-7000-8000-0000000b0002',
  name: 'Marcus Lee, RD',
  role: 'Registered dietitian',
  category: 'Nutrition',
  where: 'Virtual · Ontario-wide',
  price: '$95 first consult',
  credentials: 'Registered Dietitian, College of Dietitians of Ontario',
  about:
    'Practical meal planning for families and athletes. Covered by most extended health plans.',
  publishedAt: '2026-03-12T15:00:00Z',
};

export const JAMES: ServiceListingFixture = {
  id: '0190c0de-0000-7000-8000-0000000b0003',
  name: 'Rev. James Whitfield',
  role: 'Faith & wellness counsellor',
  category: 'Counselling',
  where: 'Virtual or in person · Midtown',
  price: 'Sliding scale',
  credentials: 'Registered Psychotherapist, CRPO',
  about: 'Care for the whole person.',
  publishedAt: '2026-03-20T15:00:00Z',
};

export const RUTH: ServiceListingFixture = {
  id: '0190c0de-0000-7000-8000-0000000b0004',
  name: 'Ruth Abernathy',
  role: 'Physiotherapist',
  category: 'Physio',
  where: 'In person · Etobicoke',
  price: '$110 assessment',
  credentials: 'Physiotherapist, CPO',
  about: 'Rehab after injury.',
  publishedAt: '2026-01-05T15:00:00Z',
};

export const TASHA: ServiceListingFixture = {
  id: '0190c0de-0000-7000-8000-0000000b0005',
  name: 'Tasha Grant',
  role: 'Basketball skills coach',
  category: 'Coaching',
  where: 'In person · North York',
  price: 'From $45 / session',
  credentials: 'NCCP Community Coach',
  about: 'Drills for every level.',
  publishedAt: '2026-04-01T15:00:00Z',
};

export const CAST: ServiceListingFixture[] = [DANIELLE, MARCUS, JAMES, RUTH, TASHA];

/** What a spec sees of the requests it answered. */
export interface ServicesAsked {
  /** The `category` of each request, in order; `null` for All. */
  categories: (string | null)[];
}

/**
 * Answers `GET /api/services` from `services`, of the `category` asked for when there is one, as the
 * API does (ADR 0050). `fail` may refuse a request, by its zero-based number, as a reply.
 */
export function answerServices(
  api: ApiHandlers,
  services: ServiceListingFixture[],
  fail: (requestNumber: number) => { status?: number; abort?: boolean } | null = () => null,
): ServicesAsked {
  const asked: ServicesAsked = { categories: [] };
  api.on('GET', '/api/services', (request) => {
    const number = asked.categories.length;
    const category = new URL(request.url()).searchParams.get('category');
    asked.categories.push(category);
    const refusal = fail(number);
    if (refusal?.abort) return { abort: true };
    if (refusal) return { status: refusal.status ?? 400, json: { code: 'error' } };
    const matches =
      category === null ? services : services.filter((service) => service.category === category);
    return { json: { total: matches.length, services: matches } };
  });
  return asked;
}
