import { signInRefusalOf } from '../account/sign-in-refusal';

/**
 * What the Staff sign in screen shows for a failed sign-in (L2-018 AC2, AC3, L2-032 AC1; ADR 0011):
 * `invalid-credentials` as "Email or password is incorrect", naming neither field (mock `invalid`),
 * `not-staff` as "This account isn't on the team" (mock `not-staff`), `two-step-not-set-up` as
 * "Two-step verification isn't set up" (mock `two-step-not-set-up`, L2-046 AC6; ADR 0013), and
 * `failed` as "We couldn't sign you in" (mock `failed`) for anything else.
 */
export type StaffSignInRefusal =
  'invalid-credentials' | 'not-staff' | 'two-step-not-set-up' | 'failed';

/**
 * Wrong credentials read as on the member sign-in; each 403 is known by its code. The member
 * sign-in's pause and suspension (ADR 0012) are not answers of the staff session, so they read as
 * a failure here.
 */
export function staffSignInRefusalOf(error: unknown): StaffSignInRefusal {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 403 && code === 'not_staff') return 'not-staff';
  if (status === 403 && code === 'two_step_not_set_up') return 'two-step-not-set-up';
  return signInRefusalOf(error) === 'invalid-credentials' ? 'invalid-credentials' : 'failed';
}
