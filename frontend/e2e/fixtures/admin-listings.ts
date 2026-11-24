import type { ApiHandlers } from './api-handlers';

/** One live listing as `GET /api/admin/services/listings` answers it (ADR 0000). */
export interface AdminListingFixture {
  id: string;
  name: string;
  role: string;
  category: string;
  where: string;
  price: string;
  credentials: string;
  about: string;
  contactUrl: string | null;
  publishedAt: string;
}

/** The answer the fixture gives unless a spec says otherwise: nobody listed (mock `admin-services/empty`). */
export const NO_LISTINGS = { total: 0, listings: [] };

/** The mock `admin-services/default` cast, in the name order the API serves. */
export const CAST_LISTINGS: AdminListingFixture[] = [
  {
    id: '0190c0de-0000-7000-8000-0000000b0001',
    name: 'Danielle Okafor',
    role: 'Personal trainer',
    category: 'Training',
    where: 'In person · East York',
    price: 'From $70 / session',
    credentials: 'NSCA-CPT, 8 years coaching',
    about: 'Strength training for busy parents.',
    contactUrl: null,
    publishedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: '0190c0de-0000-7000-8000-0000000b0002',
    name: 'Marcus Lee, RD',
    role: 'Registered dietitian',
    category: 'Nutrition',
    where: 'Virtual · Ontario-wide',
    price: '$95 first consult',
    credentials: 'Registered Dietitian, CDO',
    about: 'Practical meal planning for families.',
    contactUrl: 'https://marcus.example.org/book',
    publishedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: '0190c0de-0000-7000-8000-0000000b0004',
    name: 'Ruth Abernathy',
    role: 'Physiotherapist',
    category: 'Physio',
    where: 'In person · Etobicoke',
    price: '$110 assessment',
    credentials: 'Physiotherapist, CPO',
    about: 'Rehab after injury.',
    contactUrl: null,
    publishedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: '0190c0de-0000-7000-8000-0000000b0005',
    name: 'Tasha Grant',
    role: 'Basketball skills coach',
    category: 'Coaching',
    where: 'In person · North York',
    price: 'From $45 / session',
    credentials: 'NCCP Community Coach',
    about: 'Drills for every level.',
    contactUrl: null,
    publishedAt: '2026-03-12T15:00:00Z',
  },
  {
    id: '0190c0de-0000-7000-8000-0000000b0003',
    name: 'Rev. James Whitfield',
    role: 'Faith & wellness counsellor',
    category: 'Counselling',
    where: 'Virtual or in person · Midtown',
    price: 'Sliding scale',
    credentials: 'Registered Psychotherapist, CRPO',
    about: 'Care for the whole person.',
    contactUrl: null,
    publishedAt: '2026-03-12T15:00:00Z',
  },
];

/** The answer for `listings`; `total` is how many exist in all. */
export function adminListings(
  listings: readonly AdminListingFixture[],
  total = listings.length,
): { json: { total: number; listings: readonly AdminListingFixture[] } } {
  return { json: { total, listings } };
}

/** What a spec sees of the listing saves it answered. */
export interface ListingsSaved {
  /** Each save as the listing id and the body sent, in order. */
  saves: { id: string; body: Record<string, unknown> }[];
  /** The ids asked to be removed, in order (slice 23.2). */
  removals: string[];
  /** The listings as they stand after the saves and removals. */
  current: AdminListingFixture[];
}

/**
 * Answers `GET /api/admin/services/listings` and `PUT .../{id}` over `listings`, as the API does
 * (ADR 0055): a save replaces the listing's fields, and the next list shows them. `refuse` may answer
 * a save, by its zero-based number, with a refusal instead; `hold` holds each save until it settles.
 * `DELETE .../{id}` (slice 23.2) removes the listing and answers 204; `refuseRemove` answers one by its
 * number with a refusal instead and `holdRemove` holds each removal until it settles.
 */
export function answerListings(
  api: ApiHandlers,
  listings: readonly AdminListingFixture[],
  options: {
    refuse?: (number: number) => { status?: number; abort?: boolean; json?: unknown } | null;
    hold?: Promise<void> | null;
    refuseRemove?: (number: number) => { status?: number; abort?: boolean; json?: unknown } | null;
    holdRemove?: Promise<void> | null;
  } = {},
): ListingsSaved {
  const state: ListingsSaved = { saves: [], removals: [], current: [...listings] };
  api.on('GET', '/api/admin/services/listings', () => adminListings(state.current));
  api.on('PUT', /^\/api\/admin\/services\/listings\/[0-9a-f-]{36}$/, async (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    const body = request.postDataJSON() as Record<string, unknown>;
    const number = state.saves.length;
    state.saves.push({ id, body });
    if (options.hold) await options.hold;
    const refusal = options.refuse?.(number) ?? null;
    if (refusal?.abort) return { abort: true };
    if (refusal) {
      return {
        status: refusal.status ?? 400,
        headers: { 'content-type': 'application/problem+json' },
        json: refusal.json ?? { code: 'error' },
      };
    }
    const at = state.current.findIndex((listing) => listing.id === id);
    const saved = {
      ...state.current[at],
      ...body,
      contactUrl: String(body['contactUrl'] ?? '').trim() || null,
    } as AdminListingFixture;
    state.current[at] = saved;
    return { json: saved };
  });
  api.on('DELETE', /^\/api\/admin\/services\/listings\/[0-9a-f-]{36}$/, async (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    const number = state.removals.length;
    state.removals.push(id);
    if (options.holdRemove) await options.holdRemove;
    const refusal = options.refuseRemove?.(number) ?? null;
    if (refusal?.abort) return { abort: true };
    if (refusal) {
      return {
        status: refusal.status ?? 500,
        headers: { 'content-type': 'application/problem+json' },
        json: refusal.json ?? { code: 'error' },
      };
    }
    state.current = state.current.filter((listing) => listing.id !== id);
    return { status: 204 };
  });
  return state;
}
