import { firstNameOf } from '../account/join';

/**
 * The label of an event's avatar stack (L2-065 AC4; ADR 0116): the first two of the members named,
 * by first name, then everyone else going counted, whether named or not ("Michael, Danielle and
 * 140 others"). With nobody named there is no stack, so no label.
 */
export function attendeeLabelOf(names: readonly string[], going: number): string | null {
  const shown = names.slice(0, 2).map((name) => firstNameOf(name) ?? name);
  if (shown.length === 0) return null;
  const others = Math.max(going - shown.length, 0);
  if (others === 0) return shown.join(' and ');
  return `${shown.join(', ')} and ${others} ${others === 1 ? 'other' : 'others'}`;
}
