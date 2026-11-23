import type { ApiError } from '@cf/api';

/** The event editor's fields, by the names its errors use (mock `event-editor`). */
export type EventFieldKey =
  | 'title'
  | 'category'
  | 'date'
  | 'startTime'
  | 'place'
  | 'area'
  | 'price'
  | 'capacity'
  | 'summary'
  | 'image';

/** The message under each field the server refused (L2-022 AC8), by field. */
export type EventFieldErrors = Partial<Record<EventFieldKey, string>>;

/** The editor's fields in the order the form shows them, which is the order of its error summary. */
export const EVENT_FIELD_ORDER: readonly EventFieldKey[] = [
  'title',
  'category',
  'date',
  'startTime',
  'place',
  'area',
  'price',
  'capacity',
  'summary',
  'image',
];

/** The id of each field's control, which the error summary's links name. */
export const EVENT_FIELD_IDS: Record<EventFieldKey, string> = {
  title: 'f-title',
  category: 'f-category',
  date: 'f-date',
  startTime: 'f-time',
  place: 'f-place',
  area: 'f-area',
  price: 'f-price',
  capacity: 'f-capacity',
  summary: 'f-summary',
  image: 'f-image',
};

/** The editor field a `fieldCodes` key (the API's camel-case property) belongs to. */
const FIELD_OF_KEY: Record<string, EventFieldKey> = {
  title: 'title',
  category: 'category',
  date: 'date',
  startTime: 'startTime',
  place: 'place',
  area: 'area',
  priceCents: 'price',
  capacity: 'capacity',
  summary: 'summary',
  imageKey: 'image',
  image: 'image',
};

/** What each field code says to staff, in the mock's words (ADR 0021, ADR 0025). */
const MESSAGES: Record<string, string> = {
  title_required: 'Give the event a title',
  title_too_long: 'Use 120 characters or fewer',
  category_required: 'Choose a category from the list',
  date_required: 'Pick a date',
  start_time_required: 'Pick a start time',
  start_in_past: 'Pick a start after now',
  place_required: 'Say where it happens',
  place_too_long: 'Use 200 characters or fewer',
  area_required: 'Give the neighbourhood and city',
  area_too_long: 'Use 100 characters or fewer',
  price_invalid: 'Use a price from $0 to $10,000',
  capacity_required: 'Give a capacity',
  capacity_out_of_range: 'Use a capacity from 1 to 10,000',
  summary_required: 'Give a summary',
  summary_too_long: 'Use 1,000 characters or fewer',
  image_invalid: 'Use a JPEG, PNG or WebP image up to 5 MB',
};

const UNKNOWN_CODE = 'Check this field';

/** "36 members are going. Set a capacity of at least 36", or the one-member form. */
export function capacityBelowGoingMessage(going: number): string {
  const are = going === 1 ? '1 member is' : `${going} members are`;
  return `${are} going. Set a capacity of at least ${going}`;
}

/**
 * The messages for the fields a save refused (L2-022 AC8), or `null` when the failure is not a
 * field's: a `validation_failed` body names each failed field's code in `fieldCodes`, and
 * `capacity_below_going` (409) is Capacity's, with `going` the members going. The server's own
 * sentences are never shown.
 */
export function eventFieldErrorsOf(error: ApiError, going: number): EventFieldErrors | null {
  if (error.code === 'capacity_below_going') {
    return { capacity: capacityBelowGoingMessage(going) };
  }
  if (error.status !== 400 || !error.fieldCodes) return null;
  const errors: EventFieldErrors = {};
  for (const [key, code] of Object.entries(error.fieldCodes)) {
    const field = FIELD_OF_KEY[key];
    if (field) errors[field] = MESSAGES[code] ?? UNKNOWN_CODE;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The refused fields as the error summary's lines, in the form's order. */
export function eventErrorItems(
  errors: EventFieldErrors,
): readonly { text: string; target: string }[] {
  return EVENT_FIELD_ORDER.flatMap((field) => {
    const text = errors[field];
    return text ? [{ text, target: EVENT_FIELD_IDS[field] }] : [];
  });
}

/** The error summary's heading: "1 thing to fix before saving", "2 things to fix before saving". */
export function eventErrorHeading(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'} to fix before saving`;
}
