/**
 * What Staff sign in shows for a refused Google sign-in (L2-018 AC3, AC4, AC8, AC10, L2-049 AC5,
 * AC7, AC11; ADR 0062, ADR 0100): `wrong-domain` and `not-staff` as a sign-in notice naming the
 * account Google returned (mocks `wrong-domain`, `no-access`), `suspended` as "Your account is
 * suspended" (mock `suspended`), `not-configured` as "Sign-in isn't set up yet" (mock
 * `not-configured`), `too-many-attempts` as "Too many attempts" (mock `limited`) and `failed` as
 * "Google sign-in didn't finish" (mock `error`) for anything else.
 */
export type StaffSignInRefusal =
  | { kind: 'wrong-domain' | 'not-staff'; account: string }
  | { kind: 'suspended' | 'not-configured' | 'too-many-attempts' | 'failed' };

/** Each refusal is its status and its code together; a notice also needs the account to name. */
export function staffSignInRefusalOf(error: unknown): StaffSignInRefusal {
  const { status, code, account } = (typeof error === 'object' && error !== null ? error : {}) as {
    status?: unknown;
    code?: unknown;
    account?: unknown;
  };
  const named = typeof account === 'string' && account.length > 0 ? account : null;
  if (status === 403 && code === 'wrong_domain' && named)
    return { kind: 'wrong-domain', account: named };
  if (status === 403 && code === 'not_staff' && named) return { kind: 'not-staff', account: named };
  if (status === 403 && code === 'account_suspended') return { kind: 'suspended' };
  if (status === 503 && code === 'google_unavailable') return { kind: 'not-configured' };
  if (status === 429 && code === 'too_many_attempts') return { kind: 'too-many-attempts' };
  return { kind: 'failed' };
}
