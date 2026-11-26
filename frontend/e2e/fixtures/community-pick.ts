import type { ApiHandlers, ApiReply } from './api-handlers';

/** One event of `GET /api/admin/community-pick/events` (ADR 0098). */
export interface PickableEventFixture {
  id: string;
  title: string;
  category: 'run' | 'workout' | 'basketball' | 'mobility' | 'workshop' | 'retreat';
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  spotsLeft: number;
  imageKey: string | null;
  lastPickedAt: string | null;
}

/** The member app's public address the API answers (`MemberApp:BaseUrl`, ADR 0098). */
export const SITE_ORIGIN = 'https://www.christian.fitness';

/** Easter Sunrise 5K, Sat Apr 18 at 6:45 AM in Toronto (10:45 UTC), free, 58 places left. */
export const SUNRISE_5K: PickableEventFixture = {
  id: '018f0000-0000-7000-8000-000000000001',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00+00:00',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront, Toronto',
  priceCents: 0,
  spotsLeft: 58,
  imageKey: null,
  lastPickedAt: null,
};

/** A session of the Couch to 5K series, Tue Apr 21 at 6:30 PM. */
export const COUCH_WEEK_3: PickableEventFixture = {
  id: '018f0000-0000-7000-8000-000000000002',
  title: 'Couch to 5K: Week 3',
  category: 'run',
  startsAt: '2026-04-21T22:30:00+00:00',
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  spotsLeft: 9,
  imageKey: null,
  lastPickedAt: null,
};

/** Saturday Park Bootcamp, Sat Apr 25 at 8:00 AM, $15, 12 places left. */
export const PARK_BOOTCAMP: PickableEventFixture = {
  id: '018f0000-0000-7000-8000-000000000003',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  startsAt: '2026-04-25T12:00:00+00:00',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront, Toronto',
  priceCents: 1500,
  spotsLeft: 12,
  imageKey: null,
  lastPickedAt: null,
};

/** Women's Hoops & Devotion Night, Thu Apr 30 at 7:00 PM, last picked Apr 6. */
export const HOOPS_NIGHT: PickableEventFixture = {
  id: '018f0000-0000-7000-8000-000000000004',
  title: "Women's Hoops & Devotion Night",
  category: 'basketball',
  startsAt: '2026-04-30T23:00:00+00:00',
  place: 'St. Lawrence Community Rec Centre',
  area: 'Downtown, Toronto',
  priceCents: 0,
  spotsLeft: 6,
  imageKey: null,
  lastPickedAt: '2026-04-06T14:10:00+00:00',
};

/** Stretch & Pray: Mobility Morning, Wed May 06 at 9:30 AM. */
export const STRETCH_PRAY: PickableEventFixture = {
  id: '018f0000-0000-7000-8000-000000000005',
  title: 'Stretch & Pray: Mobility Morning',
  category: 'mobility',
  startsAt: '2026-05-06T13:30:00+00:00',
  place: 'Grace Fellowship Hall',
  area: 'Scarborough, Toronto',
  priceCents: 0,
  spotsLeft: 8,
  imageKey: null,
  lastPickedAt: null,
};

/** The five events the mocks list, soonest first. */
export const PICKABLE_EVENTS = [SUNRISE_5K, COUCH_WEEK_3, PARK_BOOTCAMP, HOOPS_NIGHT, STRETCH_PRAY];

/** The note the mocks write (60 characters). */
export const SUNRISE_NOTE = 'Flat, stroller-friendly, and you finish as the sun comes up.';

/** `GET /api/admin/community-pick/events` answering `events`. */
export function pickableEvents(events: PickableEventFixture[] = PICKABLE_EVENTS): ApiReply {
  return { json: { siteOrigin: SITE_ORIGIN, events } };
}

/** The key of the photo `withPhoto` gives an event, as the event image endpoint serves it. */
export const PICK_PHOTO_KEY = `${'a1'.repeat(16)}.png`;

/** `event` with the photo `answerPickPhoto` serves. */
export function withPhoto(event: PickableEventFixture): PickableEventFixture {
  return { ...event, imageKey: PICK_PHOTO_KEY };
}

/** A 1 × 1 white PNG: the lightest photo there is, so the graphic's shade must carry the text. */
export const WHITE_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC',
  'base64',
);

/**
 * Answers `GET /api/events/images/<PICK_PHOTO_KEY>` with `reply` (the white photo unless given),
 * and returns how many times it was asked for.
 */
export function answerPickPhoto(
  api: ApiHandlers,
  reply: () => ApiReply | Promise<ApiReply> = () => ({
    headers: { 'content-type': 'image/png' },
    body: WHITE_PHOTO,
  }),
): { asked: number } {
  const count = { asked: 0 };
  api.on('GET', `/api/events/images/${PICK_PHOTO_KEY}`, () => {
    count.asked++;
    return reply();
  });
  return count;
}

/** What `POST /api/admin/community-pick/picks` was sent. */
export interface PickSent {
  eventId: string;
  note: string;
}

/** When the fixture's picks are recorded: Fri Apr 10, 9:00 AM in Toronto. */
export const PICKED_AT = '2026-04-10T13:00:00+00:00';

/**
 * Answers `POST /api/admin/community-pick/picks` with 201 and `PICKED_AT`, or with `reply` when
 * given, and returns the bodies sent, in order (ADR 0098).
 */
export function answerPicks(api: ApiHandlers, reply?: () => ApiReply): PickSent[] {
  const sent: PickSent[] = [];
  api.on('POST', '/api/admin/community-pick/picks', (request) => {
    const body = request.postDataJSON() as PickSent;
    sent.push(body);
    return reply?.() ?? { status: 201, json: { eventId: body.eventId, pickedAt: PICKED_AT } };
  });
  return sent;
}
