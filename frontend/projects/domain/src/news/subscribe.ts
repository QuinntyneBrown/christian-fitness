import type { ApiError } from '@cf/api';
import { emailErrorOf } from '../account/email-rule';

/** What Subscribe says under a malformed or empty email (L2-057 AC3). */
export const SUBSCRIBE_EMAIL_INVALID =
  "That email doesn't look right. Check for a typo and try again.";

/**
 * Subscribe's email rule (L2-057 AC3; ADR 0110): the Join shape the API's `SubscribeValidator`
 * checks too (not blank, at most 254 characters trimmed, one `@`, a dot in the domain, no white
 * space), worded for Subscribe; `null` when the address can be sent.
 */
export function subscribeEmailErrorOf(value: string): string | null {
  return emailErrorOf(value) === null ? null : SUBSCRIBE_EMAIL_INVALID;
}

/** How a failed submission shows (L2-057 AC3, AC6, AC7). */
export type SubscribeRefusal = 'invalid' | 'limited' | 'failed';

/**
 * Reads a failed submission: the API's `email_invalid` marks the field, `too_many_attempts` (429)
 * says to try later, and anything else, a 5xx or no answer included, says the server failed.
 */
export function subscribeRefusalOf(failure: unknown): SubscribeRefusal {
  if (!isApiError(failure)) return 'failed';
  if (failure.status === 429) return 'limited';
  return failure.status === 400 && failure.code === 'validation_failed' ? 'invalid' : 'failed';
}

/** Whether a failed confirmation means the link cannot confirm (L2-058 AC3), rather than a failure. */
export function isExpiredLink(failure: unknown): boolean {
  return isApiError(failure) && failure.code === 'subscription_link_expired';
}

/** A link token Subscribe was opened with (L2-058 AC7). */
export interface FragmentToken {
  kind: 'confirm' | 'unsubscribe';
  token: string;
}

const TOKEN = /^(confirm|unsubscribe)=([A-Za-z0-9_-]{1,128})$/;

/**
 * The one token an emailed link carries in Subscribe's fragment, `confirm=<token>` or
 * `unsubscribe=<token>` (ADR 0110); none for any other fragment, such as `rss`.
 */
export function fragmentTokenOf(fragment: string | null | undefined): FragmentToken | null {
  const match = TOKEN.exec(fragment ?? '');
  return match ? { kind: match[1] as FragmentToken['kind'], token: match[2] } : null;
}

const firstIssueFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  weekday: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * When the first issue arrives, as "You're subscribed" words it (L2-058 AC2): "Saturday at 7 AM",
 * in Toronto, with the minutes only when they are not on the hour.
 */
export function firstIssueText(instant: string): string {
  const parts = firstIssueFormat.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const minute = part('minute');
  const time = minute === '00' ? part('hour') : `${part('hour')}:${minute}`;
  return `${part('weekday')} at ${time} ${part('dayPeriod').replace(/\./g, '').toUpperCase()}`;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
