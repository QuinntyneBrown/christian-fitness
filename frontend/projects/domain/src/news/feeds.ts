/** Feedly's address for following a feed (L2-060 AC4). */
const FEEDLY = 'https://feedly.com/i/subscription/feed/';

/**
 * "Open in Feedly" for a feed (L2-060 AC4; ADR 0110): Feedly's subscription address followed by
 * the feed's own, encoded as one path segment.
 */
export function feedlyUrl(feedUrl: string): string {
  return FEEDLY + encodeURIComponent(feedUrl);
}

/** About how many stories a feed carries a week, as Subscribe shows it: "~20 a week" (L2-060 AC4). */
export function storiesPerWeekText(count: number): string {
  return `~${Math.max(0, Math.round(count))} a week`;
}
