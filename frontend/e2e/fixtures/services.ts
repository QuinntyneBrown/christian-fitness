import type { ApiHandlers } from './api-handlers';

/** A listing as `GET /api/services` answers it (ADR 0000). */
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
  /** Whether the listing publishes a contact link instead of taking messages here (ADR 0053). */
  hasContactLink: boolean;
  /** The published directory listing of the same professional, for "Also in the directory" (ADR 0087). */
  directoryListingId: string | null;
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
  hasContactLink: false,
  directoryListingId: null,
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
  hasContactLink: false,
  directoryListingId: null,
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
  hasContactLink: false,
  directoryListingId: null,
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
  hasContactLink: false,
  directoryListingId: null,
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
  hasContactLink: false,
  directoryListingId: null,
};

export const CAST: ServiceListingFixture[] = [DANIELLE, MARCUS, JAMES, RUTH, TASHA];

/** What a spec sees of the requests it answered. */
export interface ServicesAsked {
  /** The `category` of each request, in order; `null` for All. */
  categories: (string | null)[];
}

/**
 * Answers `GET /api/services` from `services`, of the `category` asked for when there is one, as the
 * API does (ADR 0051). `fail` may refuse a request, by its zero-based number, as a reply.
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

/**
 * Answers `GET /api/services/{id}` from `services` as the API does (ADR 0052): the listing, or 404
 * `service_not_found`. Returns the ids asked for, in order.
 */
export function answerService(api: ApiHandlers, services: ServiceListingFixture[]): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/services\/[0-9a-f-]{36}$/, (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    asked.push(id);
    const found = services.find((service) => service.id === id);
    return found ? { json: found } : { status: 404, json: { code: 'service_not_found' } };
  });
  return asked;
}

/** The member id `POST /api/services/{id}/conversation` answers for each listing, as the API does (ADR 0053). */
export function professionalMemberOf(listing: ServiceListingFixture): string {
  return listing.id.replace(/-0000000b/, '-0000000c');
}

/**
 * Answers `POST /api/services/{id}/conversation` with the professional's member id, or with the
 * `refusal` when given (ADR 0053). Returns the listing ids asked for, in order.
 */
export function answerConversation(
  api: ApiHandlers,
  refusal: { status: number; code: string } | null = null,
): string[] {
  const asked: string[] = [];
  api.on('POST', /^\/api\/services\/[0-9a-f-]{36}\/conversation$/, (request) => {
    const id = new URL(request.url()).pathname.split('/')[3];
    asked.push(id);
    if (refusal) return { status: refusal.status, json: { code: refusal.code } };
    return { json: { memberId: id.replace(/-0000000b/, '-0000000c') } };
  });
  return asked;
}

/**
 * Answers `GET /api/services/{id}/contact-link` with `url`, as the API does (ADR 0053). Returns the
 * listing ids asked for, in order.
 */
export function answerContactLink(api: ApiHandlers, url: string): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/services\/[0-9a-f-]{36}\/contact-link$/, (request) => {
    asked.push(new URL(request.url()).pathname.split('/')[3]);
    return { json: { url } };
  });
  return asked;
}

/** What a booking request is sent with (`POST /api/services/{id}/booking-requests`; ADR 0054). */
export interface BookingSent {
  listing: string;
  body: unknown;
}

/**
 * Answers `POST /api/services/{id}/booking-requests` as the API does (ADR 0054): 201 with the
 * professional's member id, or each `refusals` entry in turn when given (the last one repeats; once
 * they are used up, none). Returns what was sent, in order.
 */
export function answerBooking(
  api: ApiHandlers,
  refusals: readonly { status: number; code: string; errors?: Record<string, string[]> }[] = [],
  hold: Promise<void> | null = null,
): BookingSent[] {
  const sent: BookingSent[] = [];
  api.on('POST', /^\/api\/services\/[0-9a-f-]{36}\/booking-requests$/, async (request) => {
    const id = new URL(request.url()).pathname.split('/')[3];
    sent.push({ listing: id, body: request.postDataJSON() });
    if (hold) await hold;
    const refusal = refusals[sent.length - 1];
    if (refusal) {
      return {
        status: refusal.status,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: refusal.status, code: refusal.code, errors: refusal.errors },
      };
    }
    return { status: 201, json: { memberId: id.replace(/-0000000b/, '-0000000c') } };
  });
  return sent;
}
