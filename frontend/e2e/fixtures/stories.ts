import type { ApiHandlers, ApiReply } from './api-handlers';

/** The mocks' "now" for a story: Wednesday 15 April 2026, 8:45 AM in Toronto. */
export const STORY_NOW = new Date('2026-04-15T12:45:00Z');

/** One "Keep reading" card as `GET /api/public/stories/{slug}` answers it (ADR 0105). */
export interface StoryCardFixture {
  slug: string;
  section: string | null;
  headline: string;
  author: string | null;
  publishedAt: string;
  image: { key: string; crop: { x: number; y: number; width: number; height: number } } | null;
}

/** A Published story as `GET /api/public/stories/{slug}` answers it (`PublishedStoryDto`, ADR 0105). */
export interface PublishedStoryFixture {
  id: string;
  slug: string;
  section: string | null;
  headline: string;
  summary: string;
  author: string | null;
  publishedAt: string;
  text: string;
  image: StoryCardFixture['image'];
  next: { kind: 'event' | 'listing'; text: string; link: string } | null;
}

/** `count` words of filler, so a story's reading time is known from the fixture (220 words a minute). */
export function words(count: number): string {
  return Array.from({ length: count }, (_, n) => `word${n + 1}`).join(' ');
}

/** The church gym story’s opening paragraph: 54 words. */
const OPENING =
  'On a Tuesday night in March, the basement of St. Anne’s Anglican on Gladstone Avenue smells like rubber flooring and coffee. Eleven rowers hum along one wall. A woman in her seventies is deadlifting a kettlebell under the eye of a volunteer coach, and a teenager is filming his first pull-up for his mother.';

/** The pull quote, written with the `>` marker (20 words; the marker is not a word). */
const QUOTE =
  '“We talk about the body as a temple every Sunday. I wanted a room where we actually looked after one.”';

/**
 * Mock `story/default`: the church gym story, published two hours before {@link STORY_NOW}, with a
 * summary, a lead image, a pull quote and a listing as its next step. Its text is 54 + 20 + 1,176
 * words = 1,250 words, so it reads "6 min read" (1,250 / 220 = 5.68, rounded up; at 200 it would be 7).
 */
export const CHURCH_GYM: PublishedStoryFixture = {
  id: '018f0000-0000-7000-8000-000000000101',
  slug: 'west-end-church-basement-gym',
  section: 'community',
  headline:
    'A West End church turned its basement into a free gym. Two hundred neighbours now train there every week',
  summary:
    'Rowers, kettlebells and a Thursday prayer circle: how St. Anne’s made fitness the front door to its parish.',
  author: 'Naomi Clarke',
  publishedAt: '2026-04-15T10:45:00Z',
  text: [OPENING, `> ${QUOTE}`, words(1176)].join('\n\n'),
  image: {
    key: '0193a9c00000700080000000000000a1.jpg',
    crop: { x: 0, y: 0, width: 1600, height: 900 },
  },
  next: {
    kind: 'listing',
    text: 'Find church sports ministries near you',
    link: '/directory/0190c0de-0000-7000-8000-0000000001a1',
  },
};

/** Mock `story/plain`: no summary, no image, no next step; 40 words, so "1 min read"; published 9:45 PM yesterday in Toronto. */
export const REST_DAY: PublishedStoryFixture = {
  id: '018f0000-0000-7000-8000-000000000102',
  slug: 'rest-day-spiritual',
  section: 'faith-and-body',
  headline: 'Why your rest day might be the most spiritual part of your training plan',
  summary: '',
  author: 'Pastor Ruth Adeyemi',
  publishedAt: '2026-04-15T01:45:00Z',
  text: words(40),
  image: null,
  next: null,
};

/**
 * Answers `GET /api/public/stories/{slug}` with the story whose current slug is asked for, and
 * 404 `not_found` for any other; returns the slugs asked for, in order.
 */
export function answerStories(
  api: ApiHandlers,
  stories: readonly PublishedStoryFixture[],
  reply?: (slug: string) => ApiReply | undefined,
): string[] {
  const asked: string[] = [];
  api.on('GET', /^\/api\/public\/stories\/[^/]+$/, (request) => {
    const slug = decodeURIComponent(new URL(request.url()).pathname.split('/').pop() ?? '');
    asked.push(slug);
    const replied = reply?.(slug);
    if (replied) return replied;
    const story = stories.find((s) => s.slug === slug);
    return story ? { json: story } : { status: 404, json: { code: 'not_found' } };
  });
  return asked;
}
