import type { GoogleJoinRequestDto, InterestKey } from '@cf/api';
import { validateJoin, type JoinFieldErrors } from './join-rules';

/** What "Finish your profile" holds while the visitor types: no email or password (L2-003 AC8). */
export interface GoogleJoinForm {
  ageConfirmed: boolean;
  fullName: string;
  homeChurch: string;
  interests: readonly InterestKey[];
}

/**
 * The rules of "Finish your profile" (L2-003 AC3, AC6, AC12): the Join rules for the fields it
 * has. The API's `CreateGoogleAccountValidator` checks the same table.
 */
export function validateGoogleJoin(form: GoogleJoinForm): JoinFieldErrors {
  const errors = validateJoin({ ...form, email: 'google@example.org', password: 'from-google' });
  delete errors.email;
  delete errors.password;
  return errors;
}

/** The request "Finish your profile" sends: a blank home church is none (L2-003 AC4). */
export function googleJoinRequestOf(form: GoogleJoinForm): GoogleJoinRequestDto {
  const homeChurch = form.homeChurch.trim();
  return {
    ageConfirmed: form.ageConfirmed,
    fullName: form.fullName,
    homeChurch: homeChurch === '' ? null : homeChurch,
    interests: [...form.interests],
  };
}
