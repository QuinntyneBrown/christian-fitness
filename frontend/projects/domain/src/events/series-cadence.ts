import type { SeriesCadenceDto } from '@cf/api';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** How often a series meets, in words (ADR 0091): "Every Tuesday", "6 dates", "No dates yet". */
export function seriesCadenceText(cadence: SeriesCadenceDto): string {
  const day = cadence.weekday === null ? undefined : WEEKDAYS[cadence.weekday];
  if (day) return `Every ${day}`;
  if (cadence.dates === 0) return 'No dates yet';
  return cadence.dates === 1 ? '1 date' : `${cadence.dates} dates`;
}
