import type { ApiReply } from './api-handlers';
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
