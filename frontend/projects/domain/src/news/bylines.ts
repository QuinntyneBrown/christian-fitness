let countFormat: Intl.NumberFormat | undefined;

/** How many stories use a byline, as Bylines' "Used by" reads it (L2-077 AC1; ADR 0093). */
export function bylineStoriesText(stories: number): string {
  if (stories === 0) return 'Not used yet';
  if (stories === 1) return '1 story';
  countFormat ??= new Intl.NumberFormat('en-US');
  return `${countFormat.format(stories)} stories`;
}
