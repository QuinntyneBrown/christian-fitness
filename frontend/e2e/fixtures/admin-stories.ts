import type { ApiHandlers, ApiReply } from './api-handlers';
import {
  BYLINES,
  CF_TEAM,
  MARCUS_BELL,
  NAOMI_CLARKE,
  PRIYA_RAMAN,
  RUTH_ADEYEMI,
} from './admin-bylines';

/** The mocks' today, 8:45 AM in Toronto on Wednesday April 15, 2026, pinned in UTC. */
export const STORIES_NOW = new Date('2026-04-15T12:45:00Z');

/** One row of `GET /api/admin/stories` (ADR 0097). */
export interface StoryRowFixture {
  id: string;
  headline: string;
  byline: string | null;
  section: string | null;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  when: string;
  reads: number | null;
}

function id(n: number): string {
  return `0193b000-0000-7000-8000-0000000057${String(n).padStart(2, '0')}`;
}

/** The eight stories of mock `admin-stories/default`, newest activity first. */
export const STORY_ROWS: StoryRowFixture[] = [
  {
    id: id(1),
    headline: 'Fasting and training: what a dietitian wants you to know',
    byline: PRIYA_RAMAN.name,
    section: 'nutrition',
    status: 'review',
    when: '2026-04-15T11:45:00Z',
    reads: null,
  },
  {
    id: id(2),
    headline: 'Pickleball is filling church gyms in Scarborough. Here’s why',
    byline: NAOMI_CLARKE.name,
    section: 'community',
    status: 'draft',
    when: '2026-04-14T18:00:00Z',
    reads: null,
  },
  {
    id: id(3),
    headline: 'What to pack for the Whole Life Retreat',
    byline: CF_TEAM.name,
    section: 'events',
    status: 'scheduled',
    when: '2026-04-18T10:00:00Z',
    reads: null,
  },
  {
    id: id(4),
    headline: 'A West End church turned its basement into a free gym',
    byline: NAOMI_CLARKE.name,
    section: 'community',
    status: 'published',
    when: '2026-04-15T11:12:00Z',
    reads: 3412,
  },
  {
    id: id(5),
    headline: 'Easter Sunrise 5K hits a record 142 sign-ups',
    byline: CF_TEAM.name,
    section: 'events',
    status: 'published',
    when: '2026-04-15T09:04:00Z',
    reads: 1980,
  },
  {
    id: id(6),
    headline: 'Danielle Okafor on coaching strength without the shame',
    byline: MARCUS_BELL.name,
    section: 'pros',
    status: 'published',
    when: '2026-04-15T07:30:00Z',
    reads: 2206,
  },
  {
    id: id(7),
    headline: 'Why your rest day might be the most spiritual part of your plan',
    byline: RUTH_ADEYEMI.name,
    section: 'faith-and-body',
    status: 'published',
    when: '2026-04-14T14:00:00Z',
    reads: 5871,
  },
  {
    id: id(8),
    headline: 'A beginner’s guide to your first outdoor bootcamp',
    byline: MARCUS_BELL.name,
    section: 'training',
    status: 'published',
    when: '2026-04-08T14:00:00Z',
    reads: 4340,
  },
];

/** The counts of the default mock. */
export const STORY_COUNTS = { all: 8, draft: 1, review: 1, scheduled: 1, published: 5 };

/** The story in review, as its call-out names it. */
export const IN_REVIEW = {
  id: STORY_ROWS[0].id,
  headline: STORY_ROWS[0].headline,
  byline: PRIYA_RAMAN.name,
  section: 'nutrition',
  submittedAt: '2026-04-15T11:45:00Z',
};

/** The answer to `GET /api/admin/stories`, the default mock unless told otherwise. */
export function storyList(
  overrides: Partial<{
    counts: typeof STORY_COUNTS;
    inReview: (typeof IN_REVIEW)[];
    items: StoryRowFixture[];
    page: number;
    pageCount: number;
  }> = {},
): ApiReply {
  return {
    json: {
      counts: STORY_COUNTS,
      inReview: [IN_REVIEW],
      items: STORY_ROWS,
      page: 1,
      pageCount: 1,
      ...overrides,
    },
  };
}

/** No stories at all (mock `admin-stories/empty`). */
export const NO_STORIES = storyList({
  counts: { all: 0, draft: 0, review: 0, scheduled: 0, published: 0 },
  inReview: [],
  items: [],
});

/** A ProblemDetails refusal with `code`, as the API answers it. */
export function storyRefusal(
  status: number,
  code: string,
  fieldCodes?: Record<string, string>,
): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: fieldCodes ? { status, code, fieldCodes } : { status, code },
  };
}

/** The editor's choices (`GET /api/admin/stories/options`): the bylines by name, events and listings. */
export const STORY_OPTIONS = {
  bylines: BYLINES.map(({ id: bylineId, name }) => ({ id: bylineId, name })),
  events: [
    { id: '0193a000-0000-7000-8000-00000000e001', title: 'Easter Sunrise 5K' },
    { id: '0193a000-0000-7000-8000-00000000e002', title: 'Saturday Park Bootcamp' },
  ],
  listings: [
    { id: '0193a000-0000-7000-8000-00000000a001', name: 'Lena Park, RD' },
    { id: '0193a000-0000-7000-8000-00000000a002', name: 'Lakeshore Runners Fellowship' },
  ],
};

/** One story as the editor reads it (`GET /api/admin/stories/{id}`; ADR 0097). */
export interface StoryFixture {
  id: string;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  version: number;
  headline: string;
  summary: string;
  text: string;
  section: string | null;
  bylineId: string | null;
  placement: 'lead' | 'top' | 'latest';
  includeInWeekly: boolean;
  pointsTo: { kind: 'event' | 'listing'; id: string } | null;
  nextStepText: string | null;
  nextStepLink: string | null;
  slug: string | null;
  image: { key: string; crop: { x: number; y: number; width: number; height: number } } | null;
  savedAt: string;
  publishedAt: string | null;
  /** A Scheduled story's time (ADR 0104). */
  publishAt: string | null;
}

/** Mock `admin-story-editor/default`: the story in review, saved 2 minutes ago. */
export const REVIEW_STORY: StoryFixture = {
  id: STORY_ROWS[0].id,
  status: 'review',
  version: 7,
  headline: 'Fasting and training: what a dietitian wants you to know before Lent ends',
  summary:
    'Lena Park, RD, on how to keep a fast and keep moving, and the signs it’s time to ease off.',
  text: 'For many members, Lent means giving something up.\n\n> “Fasting and training can live together. The mistake is pretending the fast isn’t happening.”\n\nHydration matters more than food on a fasting day.',
  section: 'nutrition',
  bylineId: PRIYA_RAMAN.id,
  placement: 'top',
  includeInWeekly: true,
  pointsTo: { kind: 'listing', id: STORY_OPTIONS.listings[0].id },
  nextStepText: 'Book a session with Lena',
  nextStepLink: `/directory/${STORY_OPTIONS.listings[0].id}`,
  slug: 'fasting-and-training',
  image: null,
  savedAt: '2026-04-15T12:43:00Z',
  publishedAt: null,
  publishAt: null,
};

/** Mock `admin-story-editor/draft`: a Draft saved yesterday. */
export const DRAFT_STORY: StoryFixture = {
  ...REVIEW_STORY,
  id: STORY_ROWS[1].id,
  status: 'draft',
  version: 3,
  headline: STORY_ROWS[1].headline,
  summary: '',
  text: 'On Wednesday nights the gym at Scarborough Community Church has a waiting list for its four courts.',
  section: 'community',
  bylineId: NAOMI_CLARKE.id,
  placement: 'latest',
  includeInWeekly: false,
  pointsTo: null,
  nextStepText: null,
  nextStepLink: null,
  slug: null,
  savedAt: '2026-04-14T18:00:00Z',
};

/** Mock `admin-story-editor/published`: published today at 7:12 AM. */
export const PUBLISHED_STORY: StoryFixture = {
  ...REVIEW_STORY,
  id: STORY_ROWS[3].id,
  status: 'published',
  version: 12,
  headline: STORY_ROWS[3].headline,
  section: 'community',
  bylineId: NAOMI_CLARKE.id,
  pointsTo: null,
  slug: 'west-end-church-basement-gym',
  savedAt: '2026-04-15T11:12:00Z',
  publishedAt: '2026-04-15T11:12:00Z',
};

/** Mock `admin-story-editor/scheduled`: to go out Saturday April 18 at 6:00 AM in Toronto. */
export const SCHEDULED_STORY: StoryFixture = {
  ...REVIEW_STORY,
  id: STORY_ROWS[2].id,
  status: 'scheduled',
  version: 5,
  headline: STORY_ROWS[2].headline,
  summary: 'Three days at Muskoka Woods, one bag. Here is what the team is bringing.',
  section: 'events',
  bylineId: CF_TEAM.id,
  pointsTo: null,
  nextStepText: null,
  nextStepLink: null,
  slug: 'retreat-packing-list',
  savedAt: '2026-04-15T12:43:00Z',
  publishAt: '2026-04-18T10:00:00Z',
};

/** What `POST /api/admin/stories` answers for New story: an empty Draft, unless told otherwise. */
export function newStory(fields: Partial<StoryFixture> = {}): StoryFixture {
  return {
    ...DRAFT_STORY,
    id: '0193b000-0000-7000-8000-0000000057ff',
    version: 1,
    headline: '',
    summary: '',
    text: '',
    section: null,
    bylineId: null,
    savedAt: STORIES_NOW.toISOString(),
    ...fields,
  };
}

/** One story as Preview reads it (`GET /api/admin/stories/{id}/preview`; L2-069 AC13). */
export interface StoryPreviewFixture {
  id: string;
  status: 'draft' | 'review' | 'scheduled' | 'published';
  section: string | null;
  headline: string;
  summary: string;
  author: string | null;
  publishedAt: string | null;
  text: string;
  image: StoryFixture['image'];
  next: { kind: 'event' | 'listing'; text: string; link: string } | null;
}

/**
 * Mock `admin-story-preview/default`, for the story in review: its text holds every block of the
 * Markdown subset, an https link, a link that is not https and raw HTML typed as words.
 */
export const REVIEW_PREVIEW: StoryPreviewFixture = {
  id: REVIEW_STORY.id,
  status: 'review',
  section: 'nutrition',
  headline: REVIEW_STORY.headline,
  summary: REVIEW_STORY.summary,
  author: PRIYA_RAMAN.name,
  publishedAt: null,
  text: [
    'For many members, Lent means giving *something* up.',
    '> “Fasting and training can live together.”',
    '## Before you start',
    '- Drink **water** first\n- Ask [Lena](https://example.org/lena)',
    '1. Rest\n2. Eat [after](javascript:alert)',
    '<b>Not bold</b>',
  ].join('\n\n'),
  image: null,
  next: {
    kind: 'listing',
    text: 'Book a session with Lena',
    link: `/directory/${STORY_OPTIONS.listings[0].id}`,
  },
};

/** Answers `GET /api/stories/images/{key}` with a 1 × 1 PNG, as the lead image endpoint does. */
export function answerStoryImages(api: ApiHandlers): void {
  api.on('GET', /^\/api\/stories\/images\/[0-9a-f]{32}\.(jpg|png|webp)$/, () => ({
    headers: { 'content-type': 'image/png' },
    body: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    ),
  }));
}
