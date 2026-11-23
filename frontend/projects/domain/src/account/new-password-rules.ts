import type { ErrorSummaryItem } from './join-rules';

/** The Reset password form's fields a rule can name, in the order the form shows them. */
export type NewPasswordField = 'password' | 'confirm';

/** One message per invalid field; a valid field has no key. */
export type NewPasswordErrors = Partial<Record<NewPasswordField, string>>;

/** The fields in the form's order, with the id of each input (the mock's `f-…` ids). */
const FIELDS: readonly { key: NewPasswordField; fieldId: string }[] = [
  { key: 'password', fieldId: 'f-password' },
  { key: 'confirm', fieldId: 'f-confirm' },
];

const PASSWORD_MIN = 8;
const MISMATCH = 'Type the same password in both fields';

/**
 * The new password's rules (L2-045 AC5; ADR 0014): at least 8 characters as typed, Join's rule,
 * which the API's `CompletePasswordResetValidator` checks with the same rows; and the confirmation
 * typed the same, which only the screen checks.
 */
export function newPasswordErrorsOf(password: string, confirm: string): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  if (password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters`;
  if (confirm !== password) errors.confirm = MISMATCH;
  return errors;
}

/** The error summary: its heading and one line per invalid field, in the form's order. */
export interface NewPasswordSummary {
  heading: string;
  items: ErrorSummaryItem[];
}

/**
 * The summary of `errors`: "Your passwords don't match" when the mismatch is the only error (the
 * mock's `invalid`), else "Check your new password"; empty with no errors.
 */
export function newPasswordSummaryOf(errors: NewPasswordErrors): NewPasswordSummary {
  const items = FIELDS.flatMap(({ key, fieldId }) => {
    const text = errors[key];
    return text ? [{ text, target: fieldId }] : [];
  });
  if (items.length === 0) return { heading: '', items };
  const onlyMismatch = items.length === 1 && errors.confirm !== undefined;
  return {
    heading: onlyMismatch ? "Your passwords don't match" : 'Check your new password',
    items,
  };
}

/**
 * The token of a reset link from its fragment (`token=…`, ADR 0010), or `null` when there is none.
 * The fragment never reaches a server, so the token is read here and sent only in a body.
 */
export function resetTokenOf(fragment: string | null): string | null {
  if (!fragment) return null;
  return new URLSearchParams(fragment).get('token') || null;
}
