import type { ApiHandlers, ApiReply } from './api-handlers';

/** A kind as the API names it (ADR 0071, ADR 0082), in the directory's order. */
export const KINDS = [
  'organization',
  'person',
  'instructor',
  'ambassador',
  'company',
  'church-ministry',
] as const;
export type KindFixture = (typeof KINDS)[number];

/** A row as `GET /api/directory` answers it (ADR 0082). */
export interface DirectoryListingFixture {
  id: string;
  kind: KindFixture;
  name: string;
  tagline: string;
  area: string;
  isVerified: boolean;
  photoKey: string | null;
  hosting: number;
  /** Searched with the rest but never served (the API answers only the fields above). */
  focus?: string[];
}

/** What the fixture answers unless a spec says otherwise: nobody listed (mock `directory/empty`). */
export const NO_DIRECTORY = {
  listings: [],
  counts: KINDS.map((kind) => ({ kind, count: 0 })),
  nextCursor: null,
};

const listing = (
  n: number,
  kind: KindFixture,
  name: string,
  tagline: string,
  area: string,
  hosting = 0,
  extra: Partial<DirectoryListingFixture> = {},
): DirectoryListingFixture => ({
  id: `0193a9c0-0000-7000-8000-0000000d${n.toString(16).padStart(4, '0')}`,
  kind,
  name,
  tagline,
  area,
  isVerified: true,
  photoKey: null,
  hosting,
  ...extra,
});

/** The mock `directory/default` cast, in the order the API serves it (kind, then name). */
export const CAST: DirectoryListingFixture[] = [
  listing(
    0xcf01,
    'organization',
    'Christian Fitness',
    'Faith-first fitness community for the GTA',
    'Toronto-wide',
    1,
    {
      focus: ['Community runs', 'Workshops', 'Retreats'],
    },
  ),
  listing(
    2,
    'organization',
    'Faith & Footwork',
    'Women’s basketball nights and youth clinics',
    'Downtown',
    1,
    {
      focus: ['Basketball', 'Women', 'Youth clinics'],
    },
  ),
  listing(
    1,
    'organization',
    'Lakeshore Runners Fellowship',
    'Beginner-friendly running club with a prayer at every finish',
    'Etobicoke',
    1,
    {
      focus: ['Running', 'Beginners', 'Race training'],
    },
  ),
  listing(
    3,
    'person',
    'Rev. James Whitfield',
    'Pastor, speaker on rest and burnout',
    'Midtown',
    0,
    {
      focus: ['Speaking', 'Rest'],
    },
  ),
  listing(
    4,
    'instructor',
    'Danielle Okafor',
    'Strength for women returning to fitness',
    'East York',
    1,
    {
      photoKey: '0f8e1c2d3b4a59687766554433221100.jpg',
      focus: ['Strength', 'Bootcamp'],
    },
  ),
  listing(
    5,
    'instructor',
    'Tasha Grant',
    'Basketball skills coach, NCCP certified',
    'North York',
    0,
    {
      focus: ['Basketball', 'Youth'],
    },
  ),
  listing(
    6,
    'ambassador',
    'Michael Chen',
    'Run leader and Christian Fitness ambassador',
    'Etobicoke',
    0,
    {
      focus: ['Running', 'Mentoring'],
    },
  ),
  listing(7, 'ambassador', 'Priya Nair', 'Hoops regular, youth mentor', 'Downtown', 0, {
    focus: ['Basketball', 'Mentoring'],
  }),
  listing(
    8,
    'company',
    'Kingdom Fuel Nutrition',
    'Canadian-made protein and electrolytes',
    'Mississauga',
    0,
    {
      focus: ['Nutrition', 'Sponsor'],
    },
  ),
  listing(
    9,
    'company',
    'Northline Athletic',
    'Running shoes and gait analysis, Roncesvalles',
    'Roncesvalles',
    0,
    {
      isVerified: false,
      focus: ['Running gear', 'Gait analysis'],
    },
  ),
  listing(
    10,
    'church-ministry',
    'Grace Fellowship Move Ministry',
    'Health and movement ministry of Grace Fellowship',
    'Scarborough',
    1,
    {
      focus: ['Mobility', 'Seniors'],
    },
  ),
  listing(
    11,
    'church-ministry',
    'St. Paul’s Sports Ministry',
    'Youth basketball and volleyball leagues',
    'Midtown',
    3,
    {
      focus: ['Youth', 'Basketball', 'Volleyball'],
    },
  ),
];

/** `count` listings of one kind named "Listing 001" upward, for paging. */
export function manyListings(
  count: number,
  kind: KindFixture = 'organization',
): DirectoryListingFixture[] {
  return Array.from({ length: count }, (_, i) =>
    listing(
      0x1000 + i,
      kind,
      `Listing ${String(i + 1).padStart(3, '0')}`,
      'A tagline',
      'Etobicoke',
    ),
  );
}

/** Folds text as the API does (ADR 0082): accents dropped, lower case. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase();
}

/** A listing as the API serves it: its focus is searched, never served (ADR 0082). */
function served(row: DirectoryListingFixture): Omit<DirectoryListingFixture, 'focus'> {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    tagline: row.tagline,
    area: row.area,
    isVerified: row.isVerified,
    photoKey: row.photoKey,
    hosting: row.hosting,
  };
}

/** One request the directory was asked, as the spec reads it. */
export interface DirectoryRequest {
  kind: string | null;
  q: string | null;
  cursor: string | null;
}

/** The answer to one request: the API's page, or a refusal by status, or no answer at all. */
export type DirectoryFault = {
  status?: number;
  code?: string;
  abort?: boolean;
  hold?: Promise<void>;
} | null;

const PAGE_SIZE = 50;

/**
 * Answers `GET /api/directory` from `listings` as the API does (ADR 0082): the `kind` chosen, a `q`
 * of 2 or more characters after trimming matching name, tagline, area or focus however accented or
 * cased, 50 to a page after `cursor` (the index of the next row), and every kind's count whatever
 * the search. `fault` may refuse a request, by its zero-based number, or hold it until a promise
 * settles. A listing's photo is answered too. Returns the requests, in order.
 */
export function answerDirectory(
  api: ApiHandlers,
  listings: DirectoryListingFixture[],
  fault: (requestNumber: number) => DirectoryFault = () => null,
): DirectoryRequest[] {
  const asked: DirectoryRequest[] = [];
  answerPhotos(api);
  api.on('GET', '/api/directory', async (request): Promise<ApiReply> => {
    const number = asked.length;
    const params = new URL(request.url()).searchParams;
    const ask = { kind: params.get('kind'), q: params.get('q'), cursor: params.get('cursor') };
    asked.push(ask);
    const refusal = fault(number);
    if (refusal?.hold) await refusal.hold;
    if (refusal?.abort) return { abort: true };
    if (refusal?.status) {
      return {
        status: refusal.status,
        headers: { 'content-type': 'application/problem+json' },
        json: { status: refusal.status, code: refusal.code ?? 'error' },
      };
    }
    const term = ask.q === null || ask.q.trim().length < 2 ? null : fold(ask.q.trim());
    const matches = listings.filter(
      (row) =>
        (ask.kind === null || row.kind === ask.kind) &&
        (term === null ||
          [row.name, row.tagline, row.area, ...(row.focus ?? [])].some((text) =>
            fold(text).includes(term),
          )),
    );
    const start = ask.cursor === null ? 0 : Number(ask.cursor);
    const page = matches.slice(start, start + PAGE_SIZE);
    const next = start + PAGE_SIZE < matches.length ? String(start + PAGE_SIZE) : null;
    return {
      json: {
        listings: page.map(served),
        counts: KINDS.map((kind) => ({
          kind,
          count: listings.filter((row) => row.kind === kind).length,
        })),
        nextCursor: next,
      },
    };
  });
  return asked;
}

/** Answers `GET /api/directory/photos/{key}` with a 1 × 1 PNG, as the photo endpoint will. */
export function answerPhotos(api: ApiHandlers): void {
  api.on('GET', /^\/api\/directory\/photos\/[0-9a-f]{32}\.(jpg|png|webp)$/, () => ({
    headers: { 'content-type': 'image/png' },
    body: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    ),
  }));
}
