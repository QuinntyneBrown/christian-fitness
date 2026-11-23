import { INTERESTS } from '@cf/api';

const LABELS = new Map<string, string>(INTERESTS.map(({ key, label }) => [key, label]));

/**
 * The labels of the interests a member follows (L2-005 AC1), in the order given: the labels Join
 * offered them by. A key the app does not know is left out rather than shown as a key.
 */
export function interestLabelsOf(keys: readonly string[]): string[] {
  return keys.flatMap((key) => {
    const label = LABELS.get(key);
    return label === undefined ? [] : [label];
  });
}
