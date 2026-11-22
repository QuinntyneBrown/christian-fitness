/** The key of an activity a member can follow, as the API stores it (ADR 0007). */
export type InterestKey =
  | 'running'
  | 'strength'
  | 'basketball'
  | 'walking-groups'
  | 'mobility'
  | 'nutrition'
  | 'cycling'
  | 'retreats';

/** One interest: the key the API takes and the label a member reads. */
export interface InterestOption {
  key: InterestKey;
  label: string;
}

/**
 * Every interest, in the order the Join mock shows them. The API lists the same keys in
 * `Interests.All`.
 */
export const INTERESTS: readonly InterestOption[] = [
  { key: 'running', label: 'Running' },
  { key: 'strength', label: 'Strength' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'walking-groups', label: 'Walking groups' },
  { key: 'mobility', label: 'Mobility' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'retreats', label: 'Retreats' },
];
