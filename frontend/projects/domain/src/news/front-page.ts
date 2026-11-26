import type { StorySectionName } from '@cf/api';

/** One view of the front page: Latest or a section (L2-001 AC1, AC3). */
export interface NewsSection {
  /** The address's `section` value (ADR 0071), or `latest` for none. */
  slug: string;
  label: string;
  /** The section's name in the API; none for Latest. */
  story: StorySectionName | null;
}

const LATEST: NewsSection = { slug: 'latest', label: 'Latest', story: null };

const SECTIONS: readonly NewsSection[] = [
  { slug: 'events', label: 'Events', story: 'events' },
  { slug: 'training', label: 'Training', story: 'training' },
  { slug: 'nutrition', label: 'Nutrition', story: 'nutrition' },
  { slug: 'faith-body', label: 'Faith & Body', story: 'faith-and-body' },
  { slug: 'community', label: 'Community', story: 'community' },
  { slug: 'pros', label: 'Pros', story: 'pros' },
];

/** The masthead's sections in order, Latest first, each with its address (L2-001 AC1, AC3). */
export const NEWS_SECTIONS: readonly (NewsSection & { href: string })[] = [
  { ...LATEST, href: '/' },
  ...SECTIONS.map((section) => ({ ...section, href: `/?section=${section.slug}` })),
];

/** The view an address's `section` value names; anything else, or none, is Latest (L2-001 AC3). */
export function newsSectionOf(value: string | null): NewsSection {
  return SECTIONS.find((section) => section.slug === value) ?? LATEST;
}

/** How many river stories the page holds at most, so the river stays bounded (ADR 0107). */
export const RIVER_MAX = 60;

/** How many river stories one page brings (ADR 0107). */
export const RIVER_PAGE = 12;

/**
 * What ends the river (ADR 0107; mocks `landing/more-stories`, `landing/river-capped`): "More
 * stories" while older stories follow, the capped line once 60 show, nothing otherwise.
 */
export function riverEndOf(shown: number, more: boolean): 'more' | 'capped' | 'end' {
  if (!more) return 'end';
  return shown >= RIVER_MAX ? 'capped' : 'more';
}
