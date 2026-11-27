import type { ApiError } from '@cf/api';

/** The word the Delete your account dialog asks for (mock `delete-account/default`). */
const CONFIRMATION_WORD = 'delete';

/**
 * Whether what the member typed is the word "delete" (L2-066 AC4; ADR 0118): in any case, with
 * spaces around it trimmed, as the API reads it.
 */
export function deleteConfirms(typed: string): boolean {
  return typed.trim().toLowerCase() === CONFIRMATION_WORD;
}

/**
 * What the Delete your account dialog shows for a refused deletion: `invalid` marks the field
 * (mock `invalid`), `staff` says staff accounts are deleted by an Admin (mock `staff-account`), and
 * `failed` says nothing was changed (mock `failed`), for anything else. The code is never shown.
 */
export type DeleteAccountRefusal = 'invalid' | 'staff' | 'failed';

const REFUSALS: readonly (readonly [number, string, DeleteAccountRefusal])[] = [
  [400, 'validation_failed', 'invalid'],
  [403, 'staff_account', 'staff'],
];

export function deleteAccountRefusalOf(error: unknown): DeleteAccountRefusal {
  const api = apiErrorOrNull(error);
  const match = REFUSALS.find(([status, code]) => status === api?.status && code === api.code);
  return match ? match[2] : 'failed';
}

/** The Sign in screen's notice for an account that is deleting (mock `sign-in/deleting`). */
export interface AccountDeletingNotice {
  /** "Your account is set to be deleted on May 10, 2026.", the day in Toronto. */
  heading: string;
  /** The account's email, as the API answered it. */
  account: string;
}

// Made once on first use, not at import: the formatter is costly to create.
let dayInToronto: Intl.DateTimeFormat | undefined;

/**
 * The notice for a sign-in refused `account_deleting` (409, L2-066 AC6; ADR 0118), which names the
 * account and when it is erased; null for any other answer, or one that lacks either.
 */
export function accountDeletingOf(error: unknown): AccountDeletingNotice | null {
  const api = apiErrorOrNull(error);
  if (api?.status !== 409 || api.code !== 'account_deleting') return null;
  if (typeof api.account !== 'string' || typeof api.erasesAt !== 'string') return null;
  const erasesAt = new Date(api.erasesAt);
  if (Number.isNaN(erasesAt.getTime())) return null;
  const day = (dayInToronto ??= new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  })).format(erasesAt);
  return { heading: `Your account is set to be deleted on ${day}.`, account: api.account };
}

function apiErrorOrNull(value: unknown): Partial<ApiError> | null {
  return typeof value === 'object' && value !== null ? (value as Partial<ApiError>) : null;
}
