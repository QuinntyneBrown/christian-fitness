import type { ApiHandlers } from './api-handlers';
import { BOOTCAMP, HOOPS_NIGHT, SUNRISE_5K, type EventSummary } from './events';

/** A story as `GET /api/public/stories` and the most-read list answer it (`StorySummaryDto`, ADR 0107). */
export interface StorySummaryFixture {
  id: string;
  slug: string;
  section: string | null;
  headline: string;
  summary: string | null;
  author: string | null;
  publishedAt: string;
  image: { key: string; crop: { x: number; y: number; width: number; height: number } } | null;
}

/** The front page as `GET /api/public/stories` answers it (`FrontPageDto`, ADR 0107). */
export interface FrontPageFixture {
  lead: StorySummaryFixture | null;
  headlines: StorySummaryFixture[];
  latest: StorySummaryFixture[];
  more: boolean;
}

const CROP = { x: 0, y: 0, width: 1600, height: 900 };

function story(
  n: number,
  section: string | null,
  headline: string,
  author: string | null,
  publishedAt: string,
  summary: string | null = null,
  image = true,
): StorySummaryFixture {
  const hex = n.toString(16).padStart(2, '0');
  return {
    id: `018f0000-0000-7000-8000-0000000002${hex}`,
    slug: headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60),
    section,
    headline,
    summary,
    author,
    publishedAt,
    image: image ? { key: `0193a9c000007000800000000000${hex}b0.jpg`, crop: CROP } : null,
  };
}

/** Mock `landing/default`'s lead, two hours before `STORY_NOW` (8:45 AM in Toronto). */
export const LEAD = story(
  1,
  'community',
  'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
  'Naomi Clarke',
  '2026-04-15T10:45:00Z',
  'Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.',
);

/** Mock `landing/default`'s four headlines, newest first. */
export const HEADLINES = [
  story(
    2,
    'events',
    'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
    'CF Team',
    '2026-04-15T08:45:00Z',
  ),
  story(
    3,
    'pros',
    'Danielle Okafor on coaching strength without the shame',
    'Marcus Bell',
    '2026-04-15T06:45:00Z',
  ),
  story(
    4,
    'nutrition',
    'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
    'Priya Raman',
    '2026-04-15T05:45:00Z',
  ),
  story(
    5,
    'faith-and-body',
    'Why your rest day might be the most spiritual part of your training plan',
    'Pastor Ruth Adeyemi',
    '2026-04-15T04:45:00Z',
  ),
];

/** Mock `landing/default`'s river: the third has no summary and the last no image. */
export const LATEST = [
  story(
    6,
    'events',
    'Twelve GTA churches will run the Toronto Half as one team this fall',
    'Naomi Clarke',
    '2026-04-14T15:00:00Z',
    'Registration for the combined team opens May 1, with free training plans for first-time runners.',
  ),
  story(
    7,
    'community',
    'The Tuesday walking group that got 40 seniors off the couch and into the park',
    'Priya Raman',
    '2026-04-14T14:00:00Z',
    'It started with three women from Grace Fellowship and a pair of borrowed poles.',
  ),
  story(
    8,
    'events',
    'Women’s Hoops & Devotion Night is adding a second court after a waitlist of 60',
    'CF Team',
    '2026-04-14T13:00:00Z',
  ),
  story(
    9,
    'training',
    'A beginner’s guide to your first outdoor bootcamp, from what to bring to how sore you’ll be',
    'Marcus Bell',
    '2026-04-13T13:00:00Z',
    'Coach Danielle answers the eight questions she hears most at Trillium Park.',
  ),
  story(
    10,
    'pros',
    'How we vet every professional in the Christian Fitness directory',
    'CF Team',
    '2026-04-12T13:00:00Z',
    'Credentials, references and a conversation about faith: the four checks every listing passes.',
    false,
  ),
];

/** Mock `landing/default`: the lead, four headlines and five river stories, with nothing older. */
export const FRONT_PAGE: FrontPageFixture = {
  lead: LEAD,
  headlines: HEADLINES,
  latest: LATEST,
  more: false,
};

/** The Events section of mock `landing/section`: its own stories only, no top stories. */
export const EVENTS_SECTION: FrontPageFixture = {
  lead: null,
  headlines: [],
  latest: [HEADLINES[0], LATEST[0], LATEST[2]],
  more: false,
};

/** No stories at all (mock `landing/empty`), or none in a section (mock `landing/section-empty`). */
export const NO_STORIES: FrontPageFixture = { lead: null, headlines: [], latest: [], more: false };

/** `count` river stories from `from` on, an hour apart, older as they go. */
export function riverPage(from: number, count: number): StorySummaryFixture[] {
  return Array.from({ length: count }, (_, i) =>
    story(
      100 + from + i,
      'training',
      `River story ${from + i + 1}`,
      'CF Team',
      new Date(Date.parse('2026-04-12T12:00:00Z') - (from + i) * 3_600_000).toISOString(),
    ),
  );
}

/** Mock `landing/default`'s "Most read", 1 to 5. */
export const MOST_READ = [HEADLINES[3], LATEST[3], LATEST[0], HEADLINES[2], LATEST[1]];

/**
 * Answers `GET /api/public/stories` with what `answer` gives for the query (`section`, `skip`),
 * or with `status` when it is a number; records each query asked.
 */
export function answerFrontPage(
  api: ApiHandlers,
  answer: FrontPageFixture | number | ((query: URLSearchParams) => FrontPageFixture | number),
): { asked: string[] } {
  const seen = { asked: [] as string[] };
  api.on('GET', '/api/public/stories', (request) => {
    const query = new URL(request.url()).searchParams;
    seen.asked.push(query.toString());
    const reply = typeof answer === 'function' ? answer(query) : answer;
    return typeof reply === 'number'
      ? {
          status: reply,
          headers: { 'content-type': 'application/problem+json' },
          json: { status: reply },
        }
      : { json: reply };
  });
  return seen;
}

/** Answers `GET /api/public/most-read-stories` with `stories`, or with `status` when it is not 200. */
export function answerMostRead(
  api: ApiHandlers,
  stories: StorySummaryFixture[],
  status = 200,
): void {
  api.on('GET', '/api/public/most-read-stories', () =>
    status === 200
      ? { json: stories }
      : { status, headers: { 'content-type': 'application/problem+json' }, json: { status } },
  );
}

/** An event as `GET /api/public/events/upcoming` answers it: no price, capacity or going. */
export function railEvent(event: EventSummary): Record<string, string> {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    startsAt: event.startsAt,
    place: event.place,
    area: event.area,
  };
}

const COUCH_TO_5K: EventSummary = {
  ...SUNRISE_5K,
  id: '0190c0de-0000-7000-8000-00000000e021',
  title: 'Couch to 5K: Week 3',
  startsAt: '2026-04-21T22:30:00Z',
  area: 'Etobicoke',
};

/** Mock `landing/default`'s "Upcoming events", soonest first. */
export const NEXT_FOUR = [SUNRISE_5K, COUCH_TO_5K, BOOTCAMP, HOOPS_NIGHT].map(railEvent);

/** Answers the rail's events with `events`, or with `status` when it is not 200; records each query. */
export function answerRailEvents(
  api: ApiHandlers,
  events: Record<string, string>[],
  status = 200,
): { asked: string[] } {
  const seen = { asked: [] as string[] };
  api.on('GET', '/api/public/events/upcoming', (request) => {
    seen.asked.push(new URL(request.url()).search);
    return status === 200
      ? { json: events }
      : { status, headers: { 'content-type': 'application/problem+json' }, json: { status } };
  });
  return seen;
}
