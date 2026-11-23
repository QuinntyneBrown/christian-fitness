import type { ApiHandlers } from './api-handlers';

/** An event as `GET /api/events` answers it (ADR 0027): the app words the date and the price. */
export interface EventSummary {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  place: string;
  area: string;
  priceCents: number;
  capacity: number;
  going: number;
  imageKey: string | null;
}

/** The first event of the mock `events/default`: 6:45 AM on Saturday, April 18 in Toronto. */
export const SUNRISE_5K: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e001',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00Z',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront',
  priceCents: 0,
  capacity: 200,
  going: 142,
  imageKey: null,
};

/** The second: $10, 8:00 AM on Saturday, April 25, with 12 of 50 spots left (so not "few"). */
export const BOOTCAMP: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e003',
  title: 'Saturday Park Bootcamp',
  category: 'workout',
  startsAt: '2026-04-25T12:00:00Z',
  place: 'Trillium Park, Ontario Place',
  area: 'Waterfront',
  priceCents: 1000,
  capacity: 50,
  going: 38,
  imageKey: null,
};

/** The third: 7:00 PM on Thursday, April 30, with 6 spots left (few, so said in words). */
export const HOOPS_NIGHT: EventSummary = {
  id: '0190c0de-0000-7000-8000-00000000e002',
  title: "Women's Hoops & Devotion Night",
  category: 'basketball',
  startsAt: '2026-04-30T23:00:00Z',
  place: 'St. Lawrence Community Rec Centre',
  area: 'Downtown',
  priceCents: 0,
  capacity: 30,
  going: 24,
  imageKey: null,
};

/** The `n`th generated event (1-based), one a day, so a long list pages in order. */
export function generatedEvent(n: number): EventSummary {
  const start = new Date(Date.UTC(2026, 4, 1, 12, 0, 0) + n * 86_400_000);
  return {
    id: `0190c0de-0000-7000-8000-${String(n).padStart(12, '0')}`,
    title: `Generated event ${n}`,
    category: 'run',
    startsAt: start.toISOString(),
    place: 'Martin Goodman Trail',
    area: 'Waterfront',
    priceCents: 0,
    capacity: 100,
    going: 3,
    imageKey: null,
  };
}

/** What a spec sees of the requests it answered. */
export interface EventsAsked {
  /** The `cursor` of each request, in order; `null` for the first page. */
  cursors: (string | null)[];
  categories: (string | null)[];
}

/**
 * Answers `GET /api/events` from `events`, 20 to a page, the cursor being the index of the next one
 * (opaque to the app). `fail` may refuse a request, by its zero-based number, as a reply.
 */
export function answerEvents(
  api: ApiHandlers,
  events: EventSummary[],
  fail: (requestNumber: number) => { status?: number; abort?: boolean } | null = () => null,
): EventsAsked {
  const asked: EventsAsked = { cursors: [], categories: [] };
  api.on('GET', '/api/events', (request) => {
    const number = asked.cursors.length;
    const cursor = new URL(request.url()).searchParams.get('cursor');
    const category = new URL(request.url()).searchParams.get('category');
    asked.categories.push(category);
    asked.cursors.push(cursor);
    const refusal = fail(number);
    if (refusal?.abort) return { abort: true };
    if (refusal) return { status: refusal.status ?? 400, json: { code: 'error' } };
    const from = cursor === null ? 0 : Number(cursor);
    const matches =
      category === null ? events : events.filter((event) => event.category === category);
    const page = matches.slice(from, from + 20);
    const next = from + 20 < matches.length ? String(from + 20) : null;
    return { json: { events: page, nextCursor: next } };
  });
  return asked;
}

/** An event as `GET /api/events/{id}` answers it (ADR 0031): the summary's fields and its summary text. */
export interface EventDetail extends EventSummary {
  summary: string;
}

/** The first event in full: the mock `event-detail/unregistered`, 12 of 50 spots left. */
export const BOOTCAMP_DETAIL: EventDetail = {
  ...BOOTCAMP,
  summary: 'Forty-five minutes of full-body circuits for every level. Bring a mat and water.',
};

/**
 * Answers `GET /api/events/{id}` for each of `events`, and 404 `event_not_found` for any other id,
 * as the API does (ADR 0031). Returns the ids asked for, in order.
 */
export function answerEvent(api: ApiHandlers, events: EventDetail[]): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/events\/[0-9a-f-]{36}$/, (request) => {
    const id = new URL(request.url()).pathname.split('/').pop() ?? '';
    asked.push(id);
    const found = events.find((event) => event.id === id);
    return found ? { json: found } : { status: 404, json: { code: 'event_not_found' } };
  });
  return asked;
}
