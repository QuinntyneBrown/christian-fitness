import { signInRefusalOf } from '../account/sign-in-refusal';

/**
 * What the Staff sign in screen shows for a failed sign-in (L2-018 AC2, AC3, L2-032 AC1; ADR 0010):
 * `invalid-credentials` as "Email or password is incorrect", naming neither field (mock `invalid`),
 * `not-staff` as "This account isn't on the team" (mock `not-staff`), and `failed` as "We couldn't
 * sign you in" (mock `failed`) for anything else.
 */
export type StaffSignInRefusal = 'invalid-credentials' | 'not-staff' | 'failed';

/** Wrong credentials read as on the member sign-in; only a 403 with `not_staff` is not staff. */
export function staffSignInRefusalOf(error: unknown): StaffSignInRefusal {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 403 && code === 'not_staff') return 'not-staff';
  return signInRefusalOf(error);
}
