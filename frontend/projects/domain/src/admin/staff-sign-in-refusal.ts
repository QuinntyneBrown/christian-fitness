import { signInRefusalOf } from '../account/sign-in-refusal';

/**
 * What the Staff sign in screen shows for a failed sign-in (L2-018 AC2, AC3, L2-032 AC1; ADR 0011):
 * `invalid-credentials` as "Email or password is incorrect", naming neither field (mock `invalid`),
 * `not-staff` as "This account isn't on the team" (mock `not-staff`), `two-step-not-set-up` as
 * "Two-step verification isn't set up" (mock `two-step-not-set-up`, L2-046 AC6; ADR 0013),
 * `too-many-attempts` as "Sign-in paused for 15 minutes" (mock `error`, L2-018 AC3 with L2-004 AC3;
 * ADR 0014), and `failed` as "We couldn't sign you in" (mock `failed`) for anything else.
 */
export type StaffSignInRefusal =
  'invalid-credentials' | 'not-staff' | 'two-step-not-set-up' | 'too-many-attempts' | 'failed';

/**
 * Wrong credentials and the pause read as on the member sign-in, whose window staff share (ADR
 * 0014); each 403 is known by its code. The member's suspension (ADR 0012) is not an answer of the
 * staff session, so it reads as a failure here.
 */
export function staffSignInRefusalOf(error: unknown): StaffSignInRefusal {
  const { status, code } = (error ?? {}) as { status?: unknown; code?: unknown };
  if (status === 403 && code === 'not_staff') return 'not-staff';
  if (status === 403 && code === 'two_step_not_set_up') return 'two-step-not-set-up';
  const shared = signInRefusalOf(error);
  return shared === 'invalid-credentials' || shared === 'too-many-attempts' ? shared : 'failed';
}
