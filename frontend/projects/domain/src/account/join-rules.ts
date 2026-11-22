import type { JoinForm } from './join';

/** The Join form's fields a rule can name, in the order the form shows them. */
export type JoinField = 'fullName' | 'email' | 'password' | 'homeChurch';

/** One message per invalid field; a valid field has no key. */
export type JoinFieldErrors = Partial<Record<JoinField, string>>;

/** The fields in the form's order, with the id of each input (the mock's `f-…` ids). */
export const JOIN_FIELDS: readonly { key: JoinField; fieldId: string }[] = [
  { key: 'fullName', fieldId: 'f-name' },
  { key: 'email', fieldId: 'f-email' },
  { key: 'password', fieldId: 'f-password' },
  { key: 'homeChurch', fieldId: 'f-church' },
];

/** One line of the error summary: the message and the id of the field it moves focus to. */
export interface ErrorSummaryItem {
  text: string;
  target: string;
}

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const HOME_CHURCH_MAX = 120;
const PASSWORD_MIN = 8;

/** One `@`, something on both sides, a dot in the domain and no white space (ADR 0008). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMAIL_INVALID = 'Enter an email address like name@example.com';

/**
 * The Join rules (L2-003 AC3, AC6; ADR 0008): each invalid field's message, in the form's order.
 * The API's `CreateAccountValidator` checks the same table, so a form that passes here is not
 * refused there. Lengths count the trimmed text; the password counts as typed.
 */
export function validateJoin(form: JoinForm): JoinFieldErrors {
  const errors: JoinFieldErrors = {};
  const name = form.fullName.trim();
  if (name === '') errors.fullName = 'Enter your full name';
  else if (name.length > NAME_MAX) errors.fullName = `Use ${NAME_MAX} characters or fewer`;

  const email = form.email.trim();
  if (email === '') errors.email = EMAIL_INVALID;
  else if (email.length > EMAIL_MAX) errors.email = `Use ${EMAIL_MAX} characters or fewer`;
  else if (!EMAIL.test(email)) errors.email = EMAIL_INVALID;

  if (form.password.length < PASSWORD_MIN) {
    errors.password = `Use at least ${PASSWORD_MIN} characters`;
  }

  if (form.homeChurch.trim().length > HOME_CHURCH_MAX) {
    errors.homeChurch = `Use ${HOME_CHURCH_MAX} characters or fewer`;
  }
  return errors;
}

/** The error summary's lines: one per invalid field, in the form's order, linking to its input. */
export function errorSummaryOf(errors: JoinFieldErrors): ErrorSummaryItem[] {
  return JOIN_FIELDS.flatMap(({ key, fieldId }) => {
    const text = errors[key];
    return text ? [{ text, target: fieldId }] : [];
  });
}

/** The errors after the visitor edits `field`: that field's error is cleared, the others stay. */
export function clearFieldError(errors: JoinFieldErrors, field: JoinField): JoinFieldErrors {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}
