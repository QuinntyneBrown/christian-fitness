import type { ApiHandlers, ApiReply } from './api-handlers';
import { answerPhotos, CAST, type KindFixture } from './directory';

/** One event a listing hosts that is still to come (`HostedEventDto`, ADR 0087). */
export interface HostedEventFixture {
  id: string;
  title: string;
  category: 'run' | 'workout' | 'basketball' | 'mobility' | 'workshop' | 'retreat';
  startsAt: string;
  place: string;
  imageKey: string | null;
}

/** The Easter Sunrise 5K: Saturday 18 April 2026, 6:45 AM in Toronto (mock `listing-profile/one-off`). */
export const SUNRISE_RUN: HostedEventFixture = {
  id: '0193a9c0-0000-7000-8000-00000000e501',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  imageKey: null,
};

/** A listed series a listing hosts (`HostedSeriesDto`, ADR 0096). */
export interface HostedSeriesFixture {
  id: string;
  title: string;
  category: HostedEventFixture['category'];
  imageKey: string | null;
  cadence: { weekday: number | null; dates: number };
  startsAt: string;
  sessionsLeft: number;
}

/**
 * Couch to 5K Run Club under Hosting (mock `listing-profile/default`): every Tuesday, next
 * Tuesday April 21 at 6:30 PM, 5 sessions left. Its id is the series fixtures' `COUCH_TO_5K`.
 */
export const COUCH_HOSTED: HostedSeriesFixture = {
  id: '0190c0de-0000-7000-8000-0000000005e1',
  title: 'Couch to 5K Run Club',
  category: 'run',
  imageKey: null,
  cadence: { weekday: 2, dates: 7 },
  startsAt: '2026-04-21T22:30:00Z',
  sessionsLeft: 5,
};

/** A published listing a profile is connected to (`ListingConnectionDto`, ADR 0087). */
export interface ConnectionFixture {
  id: string;
  kind: KindFixture;
  name: string;
  photoKey: string | null;
  relation: string;
}

/** A listing's profile as `GET /api/directory/{id}` answers it (ADR 0087). */
export interface ListingProfileFixture {
  id: string;
  kind: KindFixture;
  name: string;
  tagline: string;
  area: string;
  description: string;
  focus: string[];
  websiteUrl: string | null;
  isVerified: boolean;
  photoKey: string | null;
  followers: number;
  listedYear: number;
  hasOwner: boolean;
  hostingCount: number;
  /** Its listed series, first under Hosting (ADR 0096). */
  series: HostedSeriesFixture[];
  hosting: HostedEventFixture[];
  connections: ConnectionFixture[];
  /** The Services listing of the same owner, or that staff linked, for "Also offers services". */
  serviceListingId: string | null;
  /** Whether the signed-in member follows it (ADR 0088). */
  following: boolean;
  /** Whether the signed-in member owns it (ADR 0095). */
  isOwner: boolean;
  /** What only the owner reads: the contact email and a waiting name or kind (ADR 0095). */
  owner: OwnListingFixture | null;
}

/** What only the owner reads of their listing (`OwnListingDto`, ADR 0095). */
export interface OwnListingFixture {
  contactEmail: string | null;
  pendingName: string | null;
  pendingKind: KindFixture | null;
}

const idOf = (name: string): string => {
  const row = CAST.find((listing) => listing.name === name);
  if (!row) throw new Error(`No listing named ${name} in the directory cast`);
  return row.id;
};

/** Lakeshore Runners Fellowship (mock `listing-profile/default`). */
export const LAKESHORE: ListingProfileFixture = {
  id: idOf('Lakeshore Runners Fellowship'),
  kind: 'organization',
  name: 'Lakeshore Runners Fellowship',
  tagline: 'Beginner-friendly running club with a prayer at every finish',
  area: 'Etobicoke',
  description:
    'A west-end run club started by three neighbours in 2019. Our Couch to 5K program has graduated over 400 runners, most of whom swore they could never run.',
  focus: ['Running', 'Beginners', 'Race training'],
  websiteUrl: 'https://lakeshorerunners.ca',
  isVerified: true,
  photoKey: null,
  followers: 612,
  listedYear: 2025,
  hasOwner: true,
  hostingCount: 0,
  series: [],
  hosting: [],
  connections: [
    {
      id: idOf('Michael Chen'),
      kind: 'ambassador',
      name: 'Michael Chen',
      photoKey: '1a2b3c4d5e6f708192a3b4c5d6e7f801.jpg',
      relation: 'Run leader',
    },
    {
      id: idOf('Northline Athletic'),
      kind: 'company',
      name: 'Northline Athletic',
      photoKey: null,
      relation: 'Shoe partner',
    },
  ],
  serviceListingId: null,
  following: false,
  isOwner: false,
  owner: null,
};

/** Danielle Okafor, an instructor with a photo (mock `listing-profile/person`). */
export const OKAFOR: ListingProfileFixture = {
  id: idOf('Danielle Okafor'),
  kind: 'instructor',
  name: 'Danielle Okafor',
  tagline: 'Strength for women returning to fitness',
  area: 'East York',
  description:
    'Nine years coaching women back into strength after kids, injury or a long break. Small-group bootcamps outdoors from April to October.',
  focus: ['Strength', 'Bootcamp', 'Postpartum'],
  websiteUrl: null,
  isVerified: true,
  photoKey: '0f8e1c2d3b4a59687766554433221100.jpg',
  followers: 935,
  listedYear: 2024,
  hasOwner: true,
  hostingCount: 0,
  series: [],
  hosting: [],
  connections: [],
  serviceListingId: null,
  following: false,
  isOwner: false,
  owner: null,
};

/** Christian Fitness, the team's own listing (mock `listing-profile/one-off`). */
export const TEAM: ListingProfileFixture = {
  id: idOf('Christian Fitness'),
  kind: 'organization',
  name: 'Christian Fitness',
  tagline: 'Faith-first fitness community for the GTA',
  area: 'Toronto-wide',
  description:
    'We run free community events across Toronto and keep this directory honest: every listing is checked by our team before it goes live.',
  focus: ['Community runs', 'Workshops', 'Retreats'],
  websiteUrl: 'https://www.christian.fitness',
  isVerified: true,
  photoKey: null,
  followers: 2140,
  listedYear: 2024,
  hasOwner: false,
  hostingCount: 1,
  series: [],
  hosting: [SUNRISE_RUN],
  connections: [],
  serviceListingId: null,
  following: false,
  isOwner: false,
  owner: null,
};

/** Northline Athletic, an unverified company (mock `listing-profile/unverified`). */
export const NORTHLINE: ListingProfileFixture = {
  id: idOf('Northline Athletic'),
  kind: 'company',
  name: 'Northline Athletic',
  tagline: 'Running shoes and gait analysis, Roncesvalles',
  area: 'Roncesvalles',
  description:
    'Independent running store. Free gait analysis for Couch to 5K members and 15% off for anyone in the directory.',
  focus: ['Running gear', 'Gait analysis'],
  websiteUrl: 'https://northlineathletic.ca',
  isVerified: false,
  photoKey: null,
  followers: 256,
  listedYear: 2026,
  hasOwner: false,
  hostingCount: 0,
  series: [],
  hosting: [],
  connections: [],
  serviceListingId: null,
  following: false,
  isOwner: false,
  owner: null,
};

/**
 * Eastside Ladies Who Lift as its owner reads it (mock `listing-profile/owner`; ADR 0095): claimed
 * from a suggestion, so it is not in the directory cast.
 */
export const EASTSIDE_OWNED: ListingProfileFixture = {
  id: '0193a9c0-0000-7000-8000-0000000ea501',
  kind: 'organization',
  name: 'Eastside Ladies Who Lift',
  tagline: 'Saturday morning strength group out of Danforth Baptist',
  area: 'East York',
  description:
    'About 25 women, coached by a CSEP trainer. We pray before and after and are so welcoming to beginners.',
  focus: ['Strength', 'Beginners', 'Women'],
  websiteUrl: 'https://eastsideladies.ca',
  isVerified: true,
  photoKey: null,
  followers: 0,
  listedYear: 2026,
  hasOwner: true,
  hostingCount: 0,
  hosting: [],
  connections: [],
  serviceListingId: null,
  following: false,
  isOwner: true,
  owner: { contactEmail: 'eastsideladies@example.org', pendingName: null, pendingKind: null },
};

export const PROFILES: ListingProfileFixture[] = [LAKESHORE, OKAFOR, TEAM, NORTHLINE];

/** The answer to one profile request: the API's profile, a refusal by status, or no answer. */
export type ProfileFault = {
  status?: number;
  code?: string;
  abort?: boolean;
  hold?: Promise<void>;
} | null;

/**
 * Answers `GET /api/directory/{id}` from `profiles` as the API does (ADR 0087): an id not among
 * them is 404 `listing_not_found`. `fault` may refuse a request, by its zero-based number, or hold
 * it until a promise settles. A listing's photo is answered too. Returns the ids asked, in order.
 */
export function answerListingProfile(
  api: ApiHandlers,
  profiles: ListingProfileFixture[],
  fault: (requestNumber: number) => ProfileFault = () => null,
): string[] {
  const asked: string[] = [];
  answerPhotos(api);
  api.on('GET', /^\/api\/directory\/[0-9a-f-]{36}$/, async (request): Promise<ApiReply> => {
    const number = asked.length;
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    asked.push(id);
    const refusal = fault(number);
    if (refusal?.hold) await refusal.hold;
    if (refusal?.abort) return { abort: true };
    const problem = (status: number, code: string): ApiReply => ({
      status,
      headers: { 'content-type': 'application/problem+json' },
      json: { status, code },
    });
    if (refusal?.status) return problem(refusal.status, refusal.code ?? 'error');
    const profile = profiles.find((candidate) => candidate.id === id);
    return profile ? { json: profile } : problem(404, 'listing_not_found');
  });
  return asked;
}

/** Answers `GET /api/events/images/{key}` with a 1 × 1 PNG, as the event image endpoint does. */
export function answerEventImages(api: ApiHandlers): void {
  api.on('GET', /^\/api\/events\/images\/[0-9a-f]{32}\.(jpg|png|webp)$/, () => ({
    headers: { 'content-type': 'image/png' },
    body: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    ),
  }));
}

/** The owner `POST /api/directory/{id}/conversation` answers, or the refusal it gives instead. */
export type ConversationReply = { memberId: string } | ProfileFault;

/**
 * Answers `POST /api/directory/{id}/conversation` with `reply`, and returns the ids asked for, in
 * order (ADR 0087).
 */
export function answerListingConversation(api: ApiHandlers, reply: ConversationReply): string[] {
  const asked: string[] = [];
  api.on('POST', /^\/api\/directory\/[0-9a-f-]{36}\/conversation$/, (request): ApiReply => {
    asked.push(new URL(request.url()).pathname.split('/')[3] ?? '');
    if (reply && 'memberId' in reply)
      return { json: { memberId: reply.memberId, contactEmail: null } };
    if (reply?.abort) return { abort: true };
    const status = reply?.status ?? 500;
    return {
      status,
      headers: { 'content-type': 'application/problem+json' },
      json: { status, code: reply?.code ?? 'error' },
    };
  });
  return asked;
}

/** What the owner's editor sends (`PUT /api/directory/{id}`, ADR 0095). */
export interface OwnListingUpdateBody {
  name: string;
  kind: KindFixture;
  about: string;
  website: string | null;
  photoKey: string | null;
  focus: string[];
  contactEmail: string | null;
}

/** The answer to one owner's save: the listing as saved, a refusal, or no answer. */
export type OwnListingSaveReply =
  | { listing: ListingProfileFixture; nameChangePending?: boolean; hold?: Promise<void> }
  | {
      status: number;
      code?: string;
      fieldCodes?: Record<string, string>;
      abort?: boolean;
      hold?: Promise<void>;
    };

/**
 * Answers `PUT /api/directory/{id}` (ADR 0095) with `reply(n)` for the `n`th save, zero-based, and
 * returns the bodies sent, in order. A reply may hold its answer until a promise settles.
 */
export function answerOwnListingSave(
  api: ApiHandlers,
  reply: (requestNumber: number, body: OwnListingUpdateBody) => OwnListingSaveReply,
): OwnListingUpdateBody[] {
  const sent: OwnListingUpdateBody[] = [];
  api.on('PUT', /^\/api\/directory\/[0-9a-f-]{36}$/, async (request): Promise<ApiReply> => {
    const body = request.postDataJSON() as OwnListingUpdateBody;
    const answer = reply(sent.length, body);
    sent.push(body);
    if (answer.hold) await answer.hold;
    if ('listing' in answer) {
      return {
        json: { nameChangePending: answer.nameChangePending ?? false, listing: answer.listing },
      };
    }
    if (answer.abort) return { abort: true };
    return {
      status: answer.status,
      headers: { 'content-type': 'application/problem+json' },
      json: {
        status: answer.status,
        code: answer.code ?? 'error',
        ...(answer.fieldCodes ? { fieldCodes: answer.fieldCodes } : {}),
      },
    };
  });
  return sent;
}

/**
 * Answers the owner's `POST /api/directory/photos` (ADR 0095) with `reply(n)` for the `n`th upload:
 * a key, or a refusal. Returns how many were sent.
 */
export function answerOwnListingPhoto(
  api: ApiHandlers,
  reply: (
    requestNumber: number,
  ) =>
    { photoKey: string } | { status: number; code?: string; fieldCodes?: Record<string, string> },
): { count: number } {
  const sent = { count: 0 };
  api.on('POST', /^\/api\/directory\/photos$/, (): ApiReply => {
    const answer = reply(sent.count);
    sent.count += 1;
    if ('photoKey' in answer) return { status: 201, json: answer };
    return {
      status: answer.status,
      headers: { 'content-type': 'application/problem+json' },
      json: {
        status: answer.status,
        code: answer.code ?? 'error',
        ...(answer.fieldCodes ? { fieldCodes: answer.fieldCodes } : {}),
      },
    };
  });
  return sent;
}
