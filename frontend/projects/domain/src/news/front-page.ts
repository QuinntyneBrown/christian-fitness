import type { NewsSectionSlug, StorySummaryDto } from '@cf/api';
import { storyAge } from './story-list';

/** How many stories the river holds at most, however many pages are asked for (L2-037). */
export const RIVER_MAX = 60;

/** One entry of the front page's section navigation: Latest is every section, with no slug. */
export interface NewsSection {
  slug: NewsSectionSlug | null;
  label: string;
  href: string;
}

/** Latest and the six sections, in the masthead's order (L2-001 AC1), each with its address (ADR 0071). */
export const NEWS_SECTIONS: readonly NewsSection[] = [
  { slug: null, label: 'Latest', href: '/' },
  { slug: 'events', label: 'Events', href: '/?section=events' },
  { slug: 'training', label: 'Training', href: '/?section=training' },
  { slug: 'nutrition', label: 'Nutrition', href: '/?section=nutrition' },
  { slug: 'faith-body', label: 'Faith & Body', href: '/?section=faith-body' },
  { slug: 'community', label: 'Community', href: '/?section=community' },
  { slug: 'pros', label: 'Pros', href: '/?section=pros' },
];

/** The section a `section` query value names; anything else, or none, is Latest (L2-001 AC3). */
export function newsSectionOf(value: string | null): NewsSection {
  return (
    NEWS_SECTIONS.find((section) => section.slug !== null && section.slug === value) ??
    NEWS_SECTIONS[0]!
  );
}

/** A story as the front page draws it, whichever form it takes. */
export interface StoryTeaserView {
  id: string;
  href: string;
  section: string;
  heading: string;
  summary: string;
  author: string;
  age: string;
  image: string | null;
}

/** The story worded for the front page: its address, its section's name and its age in Toronto. */
export function storyTeaserOf(story: StorySummaryDto, now: Date): StoryTeaserView {
  return {
    id: story.id,
    href: `/stories/${encodeURIComponent(story.slug)}`,
    section: NEWS_SECTIONS.find((section) => section.slug === story.section)?.label ?? '',
    heading: story.headline,
    summary: story.summary ?? '',
    author: story.byline,
    age: storyAge(story.publishedAt, now),
    image: story.imageKey ? `/api/stories/images/${encodeURIComponent(story.imageKey)}` : null,
  };
}

/**
 * The river after another page arrives: the stories it held and the new ones, without a story it
 * already holds, and never more than {@link RIVER_MAX}.
 */
export function riverWith(
  held: readonly StoryTeaserView[],
  more: readonly StoryTeaserView[],
): StoryTeaserView[] {
  const ids = new Set(held.map((story) => story.id));
  return [...held, ...more.filter((story) => !ids.has(story.id))].slice(0, RIVER_MAX);
}
