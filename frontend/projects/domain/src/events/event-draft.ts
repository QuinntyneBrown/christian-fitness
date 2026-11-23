import type { CreateEventRequestDto, EventCategory } from '@cf/api';

/** What the event editor's fields hold, as typed (mock `event-editor`). */
export interface EventEditorValues {
  title: string;
  category: EventCategory;
  /** The Toronto date, `yyyy-MM-dd`, as a date input gives it. */
  date: string;
  /** The Toronto time, `HH:mm`, as a time input gives it. */
  startTime: string;
  place: string;
  area: string;
  /** The price as typed, such as "$340"; blank is free. */
  price: string;
  capacity: string;
  summary: string;
}

/** A new event: the first category, every other field blank. */
export const EMPTY_EVENT_EDITOR: EventEditorValues = {
  title: '',
  category: 'run',
  date: '',
  startTime: '',
  place: '',
  area: '',
  price: '',
  capacity: '',
  summary: '',
};

/** Dollars, an optional thousands comma every three digits, and up to two decimals. */
const AMOUNT = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/**
 * A typed price in cents (ADR 0017): blank is free (0); "$1,234.50" is 123450. Anything that is not
 * an amount of dollars and cents is `null`, which the API refuses with `price_invalid`; the API also
 * holds the upper limit.
 */
export function priceCentsOf(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  const match = AMOUNT.exec(trimmed);
  if (!match) return null;
  const cents =
    Number(match[1].replaceAll(',', '')) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents <= 2_147_483_647 ? cents : null;
}

/**
 * A typed capacity as a whole number, or `null` when it is not one (the API refuses it with
 * `capacity_required`); the API holds the range, 1 to 10,000.
 */
export function capacityOf(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const capacity = Number(trimmed);
  return capacity <= 2_147_483_647 ? capacity : null;
}

/** What Save draft sends for the editor's values (L2-022 AC1): text as typed, numbers as numbers. */
export function eventDraftOf(values: EventEditorValues): CreateEventRequestDto {
  return {
    title: values.title,
    category: values.category,
    date: values.date,
    startTime: values.startTime,
    place: values.place,
    area: values.area,
    priceCents: priceCentsOf(values.price),
    capacity: capacityOf(values.capacity),
    summary: values.summary,
  };
}
