import type { StoryStatusName } from '@cf/api';
import {
  storyByline,
  storyNextLabel,
  storyPreviewNotice,
  storyReaderWhen,
  storyListHref,
  storyListQueryOf,
  storyReadsText,
  storyReviewLabel,
  storyTabs,
  storySavedText,
  storyWhen,
} from './story-list';

// The mocks' today: Wednesday April 15, 2026, 8:45 AM in Toronto (12:45 UTC).
const NOW = new Date('2026-04-15T12:45:00Z');

describe('storyListQueryOf', () => {
  it.each([
    ['', { status: null, page: 1 }],
    ['status=review', { status: 'review', page: 1 }],
    ['status=published&page=3', { status: 'published', page: 3 }],
    ['status=archived', { status: null, page: 1 }],
    ['page=0', { status: null, page: 1 }],
    ['page=2.5', { status: null, page: 1 }],
    ['page=x', { status: null, page: 1 }],
  ])('reads "%s" as %o', (search, query) => {
    expect(storyListQueryOf(new URLSearchParams(search))).toEqual(query);
  });
});

describe('storyListHref', () => {
  it.each([
    [{ status: null, page: 1 }, '/stories'],
    [{ status: 'draft' as const, page: 1 }, '/stories?status=draft'],
    [{ status: null, page: 2 }, '/stories?page=2'],
    [{ status: 'review' as const, page: 4 }, '/stories?status=review&page=4'],
  ])('writes %o as %s', (query, href) => {
    expect(storyListHref(query)).toBe(href);
  });
});

describe('storyTabs', () => {
  it('names the five tabs with their counts and marks the chosen one (L2-068 AC3)', () => {
    const tabs = storyTabs(
      { status: 'review', page: 2 },
      { all: 8, draft: 1, review: 1, scheduled: 0, published: 6 },
    );

    expect(tabs.map((t) => [t.label, t.href, t.count, t.current])).toEqual([
      ['All', '/stories', 8, false],
      ['Draft', '/stories?status=draft', 1, false],
      ['In review', '/stories?status=review', 1, true],
      ['Scheduled', '/stories?status=scheduled', 0, false],
      ['Published', '/stories?status=published', 6, false],
    ]);
  });

  it('shows no counts before the list answers', () => {
    expect(storyTabs({ status: null, page: 1 }, null).map((t) => t.count)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe('storyWhen', () => {
  it.each<[StoryStatusName, string, string]>([
    ['draft', '2026-04-15T12:44:40Z', 'Edited just now'],
    ['draft', '2026-04-15T12:40:00Z', 'Edited 5 min ago'],
    ['review', '2026-04-15T11:45:00Z', 'Submitted 1 hour ago'],
    ['review', '2026-04-15T05:00:00Z', 'Submitted 7 hours ago'],
    // 11:30 PM on April 14 in Toronto is the day before, though it is April 15 in UTC.
    ['draft', '2026-04-15T03:30:00Z', 'Edited yesterday'],
    ['draft', '2026-04-08T15:00:00Z', 'Edited on Apr 8'],
    ['draft', '2025-12-24T15:00:00Z', 'Edited on Dec 24, 2025'],
    ['scheduled', '2026-04-18T10:00:00Z', 'Sat Apr 18, 6:00 AM'],
    ['published', '2026-04-15T11:12:00Z', 'Today, 7:12 AM'],
    ['published', '2026-04-14T20:00:00Z', 'Yesterday'],
    ['published', '2026-04-08T15:00:00Z', 'Apr 8'],
    ['published', 'not a time', ''],
  ])('words a %s story at %s as "%s"', (status, when, words) => {
    expect(storyWhen(status, when, NOW)).toBe(words);
  });
});

describe('storySavedText', () => {
  it.each<[StoryStatusName, string | null, string | null, string]>([
    ['draft', null, null, 'Not saved yet'],
    ['draft', '2026-04-15T12:44:40Z', null, 'Saved just now'],
    ['review', '2026-04-15T12:43:00Z', null, 'Saved 2 min ago'],
    ['draft', '2026-04-14T18:00:00Z', null, 'Saved yesterday'],
    ['draft', '2026-04-08T15:00:00Z', null, 'Saved on Apr 8'],
    ['published', '2026-04-15T12:00:00Z', '2026-04-15T11:12:00Z', 'Published today, 7:12 AM'],
    ['published', '2026-04-15T12:00:00Z', '2026-04-14T20:00:00Z', 'Published yesterday'],
    ['draft', 'not a time', null, ''],
  ])(
    'words a %s story saved at %s, published at %s, as "%s"',
    (status, saved, published, words) => {
      expect(storySavedText(status, saved, published, NOW)).toBe(words);
    },
  );
});

describe('storyReviewLabel', () => {
  it('says what waits and since when (L2-068 AC2)', () => {
    expect(storyReviewLabel('2026-04-15T11:45:00Z', NOW)).toBe(
      'Waiting for your review · Submitted 1 hour ago',
    );
  });
});

describe('storyByline', () => {
  it.each([
    ['Priya Raman', 'nutrition' as const, 'Priya Raman · Nutrition'],
    ['Priya Raman', null, 'Priya Raman'],
    [null, 'faith-and-body' as const, 'Faith & Body'],
    [null, null, ''],
  ])('puts %s and %s on one line as "%s"', (byline, section, line) => {
    expect(storyByline(byline, section)).toBe(line);
  });
});

describe('storyReadsText', () => {
  it.each([
    [null, null],
    [0, '0'],
    [3412, '3,412'],
  ])('shows %s reads as %s', (reads, text) => {
    expect(storyReadsText(reads)).toBe(text);
  });
});

// Mock admin-story-preview/default (L2-069 AC13).
describe('storyReaderWhen', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
  it.each([
    ['not yet published, one word', null, 'word', 'Not published yet · 1 min read'],
    ['no words at all', null, '', 'Not published yet · 1 min read'],
    ['200 words is a minute', null, words(200), 'Not published yet · 1 min read'],
    ['201 words is two', null, words(201), 'Not published yet · 2 min read'],
    ['marks alone are not words', null, `${words(200)} > - ##`, 'Not published yet · 1 min read'],
    ['published 2 hours ago', '2026-04-15T10:45:00Z', words(1100), '2 hours ago · 6 min read'],
    ['published yesterday', '2026-04-14T14:00:00Z', 'word', 'Yesterday · 1 min read'],
    ['published on Apr 8', '2026-04-08T14:00:00Z', 'word', 'Apr 8 · 1 min read'],
  ])('%s', (_why, publishedAt, text, expected) => {
    expect(storyReaderWhen(publishedAt, text, NOW)).toBe(expected);
  });
});

describe('storyPreviewNotice', () => {
  it.each([
    ['draft', 'Preview · Draft.'],
    ['review', 'Preview · In review.'],
    ['scheduled', 'Preview · Scheduled.'],
    ['published', 'Preview · Published.'],
    ['loading', 'Preview · loading.'],
    ['failed', 'Preview · not loaded.'],
  ] as const)('names a %s story', (status, lead) => {
    expect(storyPreviewNotice(status)).toEqual({
      lead,
      text: 'Only Admins can see this page. Readers see the story once it is published.',
    });
  });
});

describe('storyNextLabel', () => {
  it.each([
    ['event', 'From this story'],
    ['listing', 'In the directory'],
  ] as const)('labels a card that points to a %s', (kind, label) => {
    expect(storyNextLabel(kind)).toBe(label);
  });
});
