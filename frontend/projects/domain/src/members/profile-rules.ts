import {
  type ApiError,
  INTERESTS,
  type InterestKey,
  type OwnProfileDto,
  type UpdateProfileDto,
} from '@cf/api';

/** What the Edit profile dialog holds while the member types (ADR 0024). */
export interface ProfileForm {
  name: string;
  city: string;
  homeChurch: string;
  bio: string;
  /** The goals as typed: one per line. */
  goals: string;
  interests: readonly InterestKey[];
}

/** The dialog's fields a rule can name, in the order the dialog shows them. */
export type ProfileField = 'name' | 'homeChurch' | 'city' | 'bio' | 'goals';

/** One message per invalid field; a valid field has no key. */
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

/** The fields in the dialog's order, with the id of each control (the mock's `f-…` ids). */
export const PROFILE_FIELDS: readonly { key: ProfileField; fieldId: string }[] = [
  { key: 'name', fieldId: 'f-name' },
  { key: 'homeChurch', fieldId: 'f-church' },
  { key: 'city', fieldId: 'f-city' },
  { key: 'bio', fieldId: 'f-bio' },
  { key: 'goals', fieldId: 'f-goals' },
];

export const NAME_MAX = 100;
export const CITY_MAX = 100;
export const HOME_CHURCH_MAX = 120;
export const BIO_MAX = 300;
export const GOALS_MAX = 5;
export const GOAL_MAX = 80;

/** The dialog's values for a profile as the API answers it (L2-006 AC1). */
export function profileFormOf(profile: OwnProfileDto): ProfileForm {
  return {
    name: profile.name,
    city: profile.city ?? '',
    homeChurch: profile.homeChurch ?? '',
    bio: profile.bio ?? '',
    goals: profile.goals.join('\n'),
    interests: INTERESTS.map((interest) => interest.key).filter((key) =>
      profile.interests.includes(key),
    ),
  };
}

/** The goals typed one per line: each trimmed, blank lines dropped. */
export function goalsOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((goal) => goal.trim())
    .filter((goal) => goal !== '');
}

/**
 * The Edit profile rules (L2-006 AC3, AC6; ADR 0024): each invalid field's message, in the dialog's
 * order. The API's `UpdateProfileValidator` checks the same table, so a profile that passes here is
 * not refused there. Lengths count the trimmed text; goals count the lines that are not blank.
 */
export function validateProfile(form: ProfileForm): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = form.name.trim();
  if (name === '') errors.name = 'Enter your name so people know who you are';
  else if (name.length > NAME_MAX) errors.name = `Use ${NAME_MAX} characters or fewer`;

  if (form.homeChurch.trim().length > HOME_CHURCH_MAX) {
    errors.homeChurch = `Use ${HOME_CHURCH_MAX} characters or fewer`;
  }
  if (form.city.trim().length > CITY_MAX) errors.city = `Use ${CITY_MAX} characters or fewer`;
  if (form.bio.trim().length > BIO_MAX) errors.bio = `Keep your bio to ${BIO_MAX} characters`;

  const goals = goalsOf(form.goals);
  if (goals.some((goal) => goal.length > GOAL_MAX)) {
    errors.goals = `Keep each goal to ${GOAL_MAX} characters`;
  } else if (goals.length > GOALS_MAX) {
    errors.goals = `Choose up to ${GOALS_MAX} goals`;
  }
  return errors;
}

/** The bio's hint: how many of its 300 characters are left, or nothing once it is over. */
export function bioHintOf(bio: string): string | undefined {
  const left = BIO_MAX - bio.trim().length;
  return left >= 0 ? `A sentence or two. ${left} characters left.` : undefined;
}

/**
 * The request the dialog sends (L2-006 AC2): every value trimmed, a blank city, home church or bio
 * sent as `null`, the goals one per line without blank lines. It never says whether the home
 * church shows: Preferences does (L2-006 AC4, L2-065 AC10).
 */
export function profileRequestOf(form: ProfileForm): UpdateProfileDto {
  return {
    name: form.name.trim(),
    city: noneIfBlank(form.city),
    homeChurch: noneIfBlank(form.homeChurch),
    bio: noneIfBlank(form.bio),
    goals: goalsOf(form.goals),
    interests: [...form.interests],
  };
}

/** The error summary's lines: one per invalid field, in the dialog's order, linking to its control. */
export function profileSummaryOf(errors: ProfileFieldErrors): { text: string; target: string }[] {
  return PROFILE_FIELDS.flatMap(({ key, fieldId }) => {
    const text = errors[key];
    return text ? [{ text, target: fieldId }] : [];
  });
}

/** The errors after the member edits `field`: that field's error is cleared, the others stay. */
export function clearProfileError(
  errors: ProfileFieldErrors,
  field: ProfileField,
): ProfileFieldErrors {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

/**
 * What the dialog shows for a failed save (L2-006 AC7; ADR 0024): `refused` as the generic "Check
 * your profile" for any 4xx the API answered (mock `refused`), `failed` as "We couldn't save your
 * changes" for no answer or a 5xx (mock `failed`).
 */
export type ProfileRefusal = 'refused' | 'failed';

/** Branches on the error's status; anything that is not an `ApiError` is a failure. */
export function profileRefusalOf(error: unknown): ProfileRefusal {
  if (!isApiError(error) || error.status === 0 || error.status >= 500) return 'failed';
  return 'refused';
}

function noneIfBlank(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).code === 'string'
  );
}
