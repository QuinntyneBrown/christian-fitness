import type { ApiError, BookingKind, RequestBookingDto } from '@cf/api';

/** What the Request a booking dialog holds while the member types (ADR 0053). */
export interface BookingForm {
  kind: BookingKind;
  when: string;
  message: string;
}

/** The text fields a rule can name, in the order the dialog shows them. */
export type BookingField = 'when' | 'message';

/** One message per invalid field; a valid field has no key. */
export type BookingFieldErrors = Partial<Record<BookingField, string>>;

export const BOOKING_WHEN_MAX = 200;
export const BOOKING_MESSAGE_MAX = 1000;

/** The kinds in the order the dialog's select shows them, with their labels (the mock's). */
export const BOOKING_KIND_OPTIONS: readonly { value: BookingKind; label: string }[] = [
  { value: 'one-on-one', label: 'One-on-one session' },
  { value: 'small-group', label: 'Small-group session' },
  { value: 'intro-call', label: 'Free 15-minute intro call' },
];

/** An empty request: the free intro call chosen (the mock's default), nothing typed. */
export function emptyBookingForm(): BookingForm {
  return { kind: 'intro-call', when: '', message: '' };
}

/** The label of a kind, as the select and the success line show it. */
export function bookingKindLabel(kind: BookingKind): string {
  return BOOKING_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? '';
}

/** Reads a select's value as a kind; an unknown value keeps `fallback`. */
export function bookingKindOf(value: string, fallback: BookingKind): BookingKind {
  return BOOKING_KIND_OPTIONS.find((option) => option.value === value)?.value ?? fallback;
}

/**
 * The name to speak to: the first word of the listing's name that is not a title or a credential
 * ("Danielle Okafor" is "Danielle", "Rev. James Whitfield" is "James"). A name with nothing else is
 * kept whole, and an empty one is "the professional".
 */
export function bookingFirstName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words.find((word) => !word.endsWith('.')) ?? words[0];
  return (first ?? 'the professional').replace(/,$/, '');
}

/**
 * The Request a booking rules (L2-014 AC3; ADR 0053): `when` is required and at most 200
 * characters, the message at most 1,000, both counted trimmed. The API's `RequestBookingValidator`
 * checks the same table, so a request that passes here is not refused there.
 */
export function validateBooking(form: BookingForm, name: string): BookingFieldErrors {
  const errors: BookingFieldErrors = {};
  const when = form.when.trim().length;
  if (when === 0) {
    errors.when = `Tell ${bookingFirstName(name)} which days and times work for you`;
  } else if (when > BOOKING_WHEN_MAX) {
    errors.when = `Use ${BOOKING_WHEN_MAX} characters or fewer`;
  }
  if (form.message.trim().length > BOOKING_MESSAGE_MAX) {
    errors.message = 'Keep your message to 1,000 characters';
  }
  return errors;
}

/** The request the dialog sends: values trimmed, the message left out when blank. */
export function bookingRequestOf(form: BookingForm): RequestBookingDto {
  const message = form.message.trim();
  return {
    kind: form.kind,
    when: form.when.trim(),
    ...(message.length > 0 ? { message } : {}),
  };
}

/** The error summary's heading and lines (mock `invalid`): one line per invalid field linking to its control. */
export function bookingSummaryOf(errors: BookingFieldErrors): {
  heading: string;
  items: { text: string; target: string }[];
} {
  const items = [
    ...(errors.when ? [{ text: errors.when, target: 'f-when' }] : []),
    ...(errors.message ? [{ text: errors.message, target: 'f-message' }] : []),
  ];
  return { heading: errors.when ? "Add when you're free" : 'Check your message', items };
}

/** The errors after the member edits `field`: that field's error is cleared, the other stays. */
export function clearBookingError(
  errors: BookingFieldErrors,
  field: BookingField,
): BookingFieldErrors {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

/**
 * What the dialog shows for a failed send (L2-014 AC5; ADR 0053): `unavailable` for the code
 * `recipient_unavailable` (the professional is suspended or the listing is the member's own);
 * `failed` (mock `failed`) for any other refusal or no answer. The server's words are never shown.
 */
export type BookingRefusal = 'unavailable' | 'failed';

/** Branches on the error's `code`; anything that is not an `ApiError` is a failure. */
export function bookingRefusalOf(error: unknown): BookingRefusal {
  const code = typeof error === 'object' && error !== null ? (error as ApiError).code : undefined;
  return code === 'recipient_unavailable' ? 'unavailable' : 'failed';
}
