/** One `@`, something on both sides, a dot in the domain and no white space (ADR 0008). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The longest email an account can have, trimmed. */
export const EMAIL_MAX = 254;

/** What a form says of an email it cannot send. */
export const EMAIL_INVALID = 'Enter an email address like name@example.com';

/**
 * The reset request's email rule (L2-044 AC5; ADR 0010): the message for a blank, over-long or
 * malformed email, or `null` when it can be sent. The API's `RequestPasswordResetValidator` checks
 * the same table. The email counts trimmed.
 */
export function emailErrorOf(value: string): string | null {
  const email = value.trim();
  return email.length > 0 && email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email)
    ? null
    : EMAIL_INVALID;
}
