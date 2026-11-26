import type { StorySummaryDto } from '@cf/api';
import { NEWS_SECTIONS, newsSectionOf, RIVER_MAX, riverWith, storyTeaserOf } from './front-page';
import { storyAge } from './story-list';

// The mocks' today: Wednesday April 15, 2026, 8:45 AM in Toronto (12:45 UTC).
const NOW = new Date('2026-04-15T12:45:00Z');

describe('newsSectionOf', () => {
  it.each([
    [null, 'Latest'],
    ['', 'Latest'],
    ['events', 'Events'],
    ['training', 'Training'],
    ['nutrition', 'Nutrition'],
    ['faith-body', 'Faith & Body'],
    ['community', 'Community'],
    ['pros', 'Pros'],
    ['faith-and-body', 'Latest'],
    ['Events', 'Latest'],
    ['latest', 'Latest'],
    ['sports', 'Latest'],
  ])('reads %o as %s', (value, label) => {
    expect(newsSectionOf(value).label).toBe(label);
  });

  it('gives each section the address its slug names, and Latest the bare address', () => {
    expect(NEWS_SECTIONS.map((section) => section.href)).toEqual([
      '/',
      '/?section=events',
      '/?section=training',
      '/?section=nutrition',
      '/?section=faith-body',
      '/?section=community',
      '/?section=pros',
    ]);
  });
});

describe('storyAge', () => {
  it.each([
    ['under a minute', '2026-04-15T12:44:30Z', 'Just now'],
    ['minutes', '2026-04-15T12:20:00Z', '25 min ago'],
    ['one hour', '2026-04-15T11:45:00Z', '1 hour ago'],
    ['hours the same Toronto day', '2026-04-15T04:45:00Z', '8 hours ago'],
    ['before Toronto midnight, 9 hours back', '2026-04-15T03:45:00Z', 'Yesterday'],
    ['yesterday', '2026-04-14T18:00:00Z', 'Yesterday'],
    ['two days back', '2026-04-13T14:00:00Z', 'Apr 13'],
    ['another year', '2025-12-30T14:00:00Z', 'Dec 30, 2025'],
    ['not an instant', 'soon', ''],
  ])('%s', (_why, publishedAt, expected) => {
    expect(storyAge(publishedAt, NOW)).toBe(expected);
  });
});

const STORY: StorySummaryDto = {
  id: 'a',
  slug: 'sabbath-rest',
  section: 'faith-body',
  headline: 'Why your rest day <b>matters</b>',
  summary: null,
  byline: 'Pastor Ruth Adeyemi',
  publishedAt: '2026-04-15T04:45:00Z',
  imageKey: 'rest day.jpg',
};

describe('storyTeaserOf', () => {
  it('words a story for the front page', () => {
    expect(storyTeaserOf(STORY, NOW)).toEqual({
      id: 'a',
      href: '/stories/sabbath-rest',
      section: 'Faith & Body',
      heading: 'Why your rest day <b>matters</b>',
      summary: '',
      author: 'Pastor Ruth Adeyemi',
      age: '8 hours ago',
      image: '/api/stories/images/rest%20day.jpg',
    });
  });

  it('has no image without a key and keeps the summary it is given', () => {
    const teaser = storyTeaserOf({ ...STORY, imageKey: null, summary: 'Rest is training.' }, NOW);
    expect(teaser.image).toBeNull();
    expect(teaser.summary).toBe('Rest is training.');
  });
});

describe('riverWith', () => {
  const teasers = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => storyTeaserOf({ ...STORY, id: `s${from + i}` }, NOW));

  it.each([
    ['adds a page after the stories held', 12, teasers(13, 12), 24],
    ['skips a story it already holds', 12, [...teasers(12, 1), ...teasers(13, 2)], 14],
    ['stops at the bound', 48, teasers(49, 24), RIVER_MAX],
    ['stays the same with nothing new', 12, [], 12],
  ])('%s', (_why, held, more, expected) => {
    const river = riverWith(teasers(1, held), more);
    expect(river).toHaveLength(expected);
    expect(new Set(river.map((story) => story.id)).size).toBe(expected);
    expect(river[0]?.id).toBe('s1');
  });
});
