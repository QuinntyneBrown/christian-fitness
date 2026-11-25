import type { ApiHandlers, ApiReply } from './api-handlers';
import { answerPhotos, CAST, type KindFixture } from './directory';

/** One event a listing hosts that is still to come (`HostedEventDto`, ADR 0085). */
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

/** A published listing a profile is connected to (`ListingConnectionDto`, ADR 0085). */
export interface ConnectionFixture {
  id: string;
  kind: KindFixture;
  name: string;
  photoKey: string | null;
  relation: string;
}

/** A listing's profile as `GET /api/directory/{id}` answers it (ADR 0085). */
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
  hostingCount: number;
  hosting: HostedEventFixture[];
  connections: ConnectionFixture[];
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
  hostingCount: 0,
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
  hostingCount: 0,
  hosting: [],
  connections: [],
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
  hostingCount: 1,
  hosting: [SUNRISE_RUN],
  connections: [],
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
  hostingCount: 0,
  hosting: [],
  connections: [],
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
 * Answers `GET /api/directory/{id}` from `profiles` as the API does (ADR 0085): an id not among
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
