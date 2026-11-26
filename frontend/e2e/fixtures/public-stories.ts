import { answerStoryImages } from './admin-stories';
import type { ApiHandlers } from './api-handlers';

/** The mocks' today, 8:45 AM in Toronto on Wednesday April 15, 2026, pinned in UTC. */
export const FRONT_PAGE_NOW = '2026-04-15T12:45:00Z';

/** A story as `GET /api/public/stories` answers it (`StorySummaryDto`). */
export interface StorySummaryFixture {
  id: string;
  slug: string;
  section: 'events' | 'training' | 'nutrition' | 'faith-body' | 'community' | 'pros';
  headline: string;
  summary: string | null;
  byline: string;
  publishedAt: string;
  imageKey: string | null;
}

/** One answer of `GET /api/public/stories` (`FrontPageDto`). */
export interface FrontPageFixture {
  lead: StorySummaryFixture | null;
  headlines: StorySummaryFixture[];
  latest: StorySummaryFixture[];
  nextCursor: string | null;
  mostRead: StorySummaryFixture[];
}

function story(
  n: number,
  slug: string,
  section: StorySummaryFixture['section'],
  byline: string,
  publishedAt: string,
  headline: string,
  summary: string | null = null,
): StorySummaryFixture {
  return {
    id: `0193b000-0000-7000-8000-0000000059${String(n).padStart(2, '0')}`,
    slug,
    section,
    headline,
    summary,
    byline,
    publishedAt,
    imageKey: `${n.toString(16).padStart(32, '0')}.jpg`,
  };
}

/** The ten stories of mock `landing/default`, newest first; ages are worked from {@link FRONT_PAGE_NOW}. */
export const BASEMENT_GYM = story(
  1,
  'basement-gym',
  'community',
  'Naomi Clarke',
  '2026-04-15T10:45:00Z',
  'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
  'Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.',
);
export const EASTER_RECORD = story(
  2,
  'easter-5k-record',
  'events',
  'CF Team',
  '2026-04-15T08:45:00Z',
  'Easter Sunrise 5K hits a record 142 sign-ups with ten days to go',
);
export const OKAFOR = story(
  3,
  'okafor-interview',
  'pros',
  'Marcus Bell',
  '2026-04-15T06:45:00Z',
  'Danielle Okafor on coaching strength without the shame',
);
export const MEAL_PREP = story(
  4,
  'meal-prep-ministry',
  'nutrition',
  'Priya Raman',
  '2026-04-15T05:45:00Z',
  'Inside the Scarborough kitchen prepping 300 healthy meals a week for shift workers',
);
export const SABBATH_REST = story(
  5,
  'sabbath-rest',
  'faith-body',
  'Pastor Ruth Adeyemi',
  '2026-04-15T04:45:00Z',
  'Why your rest day might be the most spiritual part of your training plan',
);
export const HALF_MARATHON = story(
  6,
  'half-marathon-churches',
  'events',
  'Naomi Clarke',
  '2026-04-14T18:00:00Z',
  'Twelve GTA churches will run the Toronto Half as one team this fall',
  'Registration for the combined team opens May 1, with free training plans for first-time runners.',
);
export const WALKING_SENIORS = story(
  7,
  'walking-seniors',
  'community',
  'Priya Raman',
  '2026-04-14T15:00:00Z',
  'The Tuesday walking group that got 40 seniors off the couch and into the park',
  'It started with three women from Grace Fellowship and a pair of borrowed poles.',
);
export const HOOPS_LEAGUE = story(
  8,
  'hoops-league',
  'events',
  'CF Team',
  '2026-04-14T13:00:00Z',
  'Women’s Hoops & Devotion Night is adding a second court after a waitlist of 60',
);
export const BOOTCAMP_GUIDE = story(
  9,
  'park-bootcamp-guide',
  'training',
  'Marcus Bell',
  '2026-04-13T14:00:00Z',
  'A beginner’s guide to your first outdoor bootcamp, from what to bring to how sore you’ll be',
  'Coach Danielle answers the eight questions she hears most at Trillium Park.',
);
export const VETTING = story(
  10,
  'how-we-vet-every-listing',
  'pros',
  'CF Team',
  '2026-04-12T14:00:00Z',
  'How we vet every professional in the Christian Fitness directory',
  'Credentials, references and a conversation about faith: the four checks every listing passes.',
);

/** Where the front page loads a story's lead image from. */
export function storyImage(story: StorySummaryFixture): string {
  return `/api/stories/images/${story.imageKey}`;
}

export const NO_STORIES: FrontPageFixture = {
  lead: null,
  headlines: [],
  latest: [],
  nextCursor: null,
  mostRead: [],
};

/** Latest as mock `landing/default` draws it: the lead, four headlines and five more. */
export const LATEST: FrontPageFixture = {
  lead: BASEMENT_GYM,
  headlines: [EASTER_RECORD, OKAFOR, MEAL_PREP, SABBATH_REST],
  latest: [HALF_MARATHON, WALKING_SENIORS, HOOPS_LEAGUE, BOOTCAMP_GUIDE, VETTING],
  nextCursor: null,
  mostRead: [SABBATH_REST, BOOTCAMP_GUIDE, HALF_MARATHON, OKAFOR, WALKING_SENIORS],
};

/** The Events section: its three stories, newest first, and nothing else. */
export const EVENTS_SECTION: FrontPageFixture = {
  ...NO_STORIES,
  latest: [EASTER_RECORD, HALF_MARATHON, HOOPS_LEAGUE],
};

/** `count` river stories numbered from `from`, each a minute older than the one before. */
export function riverStories(from: number, count: number): StorySummaryFixture[] {
  return Array.from({ length: count }, (_, i) => {
    const n = from + i;
    return story(
      100 + n,
      `story-${n}`,
      'community',
      'CF Team',
      new Date(Date.parse('2026-04-10T12:00:00Z') - n * 60_000).toISOString(),
      `Story ${n}`,
    );
  });
}

/**
 * Answers `GET /api/public/stories`: `pages` maps a request's query string (`''` for Latest's
 * first page) to its answer; a query with no entry, or `status` other than 200, is refused.
 * Returns the query strings asked for, in order.
 */
export function answerStories(
  api: ApiHandlers,
  pages: Record<string, FrontPageFixture>,
  status = 200,
): { asked: string[] } {
  const seen = { asked: [] as string[] };
  answerStoryImages(api);
  api.on('GET', '/api/public/stories', (request) => {
    const search = new URL(request.url()).search;
    seen.asked.push(search);
    const page = pages[search];
    return status === 200 && page
      ? { json: page }
      : {
          status: status === 200 ? 404 : status,
          headers: { 'content-type': 'application/problem+json' },
          json: { status: status === 200 ? 404 : status },
        };
  });
  return seen;
}
