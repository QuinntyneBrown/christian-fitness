import type { AdminEventDetailDto, CreateEventRequestDto, EventCategory } from '@cf/api';

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
  /** The stored image's key, or none (ADR 0025). */
  imageKey: string | null;
  /** What the image field shows: the chosen file's name, or none. */
  imageName: string | null;
  /** The chosen host's listing, or none while nothing is chosen (ADR 0089). */
  hostListingId: string | null;
  /** What the Host field shows: the chosen host's name, or what is being searched. */
  hostName: string;
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
  imageKey: null,
  imageName: null,
  hostListingId: null,
  hostName: '',
};

/** Dollars, an optional thousands comma every three digits, and up to two decimals. */
const AMOUNT = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/;

/**
 * A typed price in cents (ADR 0021): blank is free (0); "$1,234.50" is 123450. Anything that is not
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
    imageKey: values.imageKey,
    hostListingId: values.hostListingId,
  };
}

/** The name the image field shows for an image already kept on an event, whose file name is not stored. */
export const KEPT_IMAGE_NAME = 'Current image';

/**
 * A price in cents as the editor types it (ADR 0021): 0 is blank (free), 34000 is "$340", 34050 is
 * "$340.50"; thousands are separated by commas, as {@link priceCentsOf} reads them.
 */
export function priceTextOf(cents: number): string {
  if (cents <= 0) return '';
  const dollars = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = cents % 100;
  return rest === 0 ? `$${dollars}` : `$${dollars}.${rest.toString().padStart(2, '0')}`;
}

/** What the editor opens with for a saved event (L2-022 AC7). */
export function eventEditorValuesOf(event: AdminEventDetailDto): EventEditorValues {
  return {
    title: event.title,
    category: event.category,
    date: event.date,
    startTime: event.startTime,
    place: event.place,
    area: event.area,
    price: priceTextOf(event.priceCents),
    capacity: String(event.capacity),
    summary: event.summary,
    imageKey: event.imageKey ?? null,
    imageName: event.imageKey ? KEPT_IMAGE_NAME : null,
    hostListingId: event.host.id,
    hostName: event.host.name,
  };
}
