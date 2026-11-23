/** What a textarea's counter says: the characters left, or how far past the limit the text is. */
export interface CharacterCount {
  readonly kind: 'left' | 'over';
  readonly text: string;
}

/**
 * The counter of a textarea with a limit (docs/design-system/components/textarea.html): "160
 * characters left." up to the limit, then "12 characters over", which the field shows as its
 * error instead of truncating what people wrote.
 */
export function characterCount(length: number, max: number): CharacterCount {
  const over = length - max;
  if (over > 0) return { kind: 'over', text: `${over} ${characters(over)} over` };
  const left = -over;
  return { kind: 'left', text: `${left} ${characters(left)} left.` };
}

function characters(count: number): string {
  return count === 1 ? 'character' : 'characters';
}
