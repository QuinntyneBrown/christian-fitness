import type { ApiError, ListingKind, SuggestListingDto, SuggestionRelation } from '@cf/api';
import { firstNameOf } from '../account/join';

/** One card of "Who are you suggesting?": the value it sends, its label and its line. */
export interface SuggestionRelationOption {
  value: SuggestionRelation;
  label: string;
  description: string;
}

/** The three cards, in the mock's order. */
export const SUGGESTION_RELATIONS: readonly SuggestionRelationOption[] = [
  { value: 'myself', label: 'Myself', description: 'I run it or I am them' },
  { value: 'someone-i-know', label: 'Someone I know', description: 'A friend, coach or group' },
  {
    value: 'somewhere-ive-been',
    label: 'Somewhere I’ve been',
    description: 'I went and loved it',
  },
];

/** One chip of "What kind of listing?": the kind it sends and its singular name. */
export interface SuggestionKindOption {
  value: ListingKind;
  label: string;
}

/** The six kinds in the directory's order, by their singular names (mock `suggest-listing`). */
export const SUGGESTION_KINDS: readonly SuggestionKindOption[] = [
  { value: 'organization', label: 'Organization' },
  { value: 'person', label: 'Person' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'ambassador', label: 'Ambassador' },
  { value: 'company', label: 'Company' },
  { value: 'church-ministry', label: 'Church Ministry' },
];

/** What the Suggest a listing form holds while the member types. */
export interface SuggestionForm {
  relation: SuggestionRelation;
  kind: ListingKind;
  name: string;
  where: string;
  website: string;
  churchConnection: string;
  reason: string;
  email: string;
  mayTellWhoSuggested: boolean;
}

/** The text fields, in the order the form shows them. */
export type SuggestionField =
  'name' | 'where' | 'website' | 'churchConnection' | 'reason' | 'email';

/** One message per field to fix; a field that is fine has no key. */
export type SuggestionFieldErrors = Partial<Record<SuggestionField, string>>;

/** The fields in the form's order, with the id of each control (the mock's `f-…` ids). */
export const SUGGESTION_FIELDS: readonly { key: SuggestionField; fieldId: string }[] = [
  { key: 'name', fieldId: 'f-name' },
  { key: 'where', fieldId: 'f-where' },
  { key: 'website', fieldId: 'f-website' },
  { key: 'churchConnection', fieldId: 'f-church' },
  { key: 'reason', fieldId: 'f-why' },
  { key: 'email', fieldId: 'f-their-email' },
];

export const SUGGESTION_NAME_REQUIRED = 'Add a name so we know who to look up.';
export const SUGGESTION_WHERE_REQUIRED = 'Add where they meet or work.';

/** A new suggestion: Someone I know, an Organization, nothing typed, permission given (mock `default`). */
export function emptySuggestionForm(): SuggestionForm {
  return {
    relation: 'someone-i-know',
    kind: 'organization',
    name: '',
    where: '',
    website: '',
    churchConnection: '',
    reason: '',
    email: '',
    mayTellWhoSuggested: true,
  };
}

/** What the form asks for a relation (L2-062 AC3). */
export interface SuggestionFormView {
  nameLabel: string;
  reasonLabel: string;
  /** Whether their email and the permission to tell them are asked. */
  asksContact: boolean;
}

/**
 * The labels and questions of the form for `relation` (L2-062 AC3; mock `self`): for Myself the
 * name and reason speak to the sender, and their email and the permission are not asked.
 */
export function suggestionFormOf(relation: SuggestionRelation): SuggestionFormView {
  return relation === 'myself'
    ? {
        nameLabel: 'Your name or your organization’s',
        reasonLabel: 'What should members know about you?',
        asksContact: false,
      }
    : { nameLabel: 'Their name', reasonLabel: 'Why should they be listed?', asksContact: true };
}

/**
 * The fields to mark before sending (L2-062 AC4; ADR 0086): a blank name or place. Every other
 * rule is the API's; a form with no key here is sent.
 */
export function checkSuggestion(form: SuggestionForm): SuggestionFieldErrors {
  const errors: SuggestionFieldErrors = {};
  if (form.name.trim() === '') errors.name = SUGGESTION_NAME_REQUIRED;
  if (form.where.trim() === '') errors.where = SUGGESTION_WHERE_REQUIRED;
  return errors;
}

/** The id of the first field `errors` names, in the form's order, or none. */
export function firstSuggestionFieldOf(errors: SuggestionFieldErrors): string | null {
  return SUGGESTION_FIELDS.find(({ key }) => errors[key] !== undefined)?.fieldId ?? null;
}

/** `errors` without `field`'s message, once the member changes that field. */
export function clearSuggestionError(
  errors: SuggestionFieldErrors,
  field: SuggestionField,
): SuggestionFieldErrors {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

const optional = (text: string): string | null => {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * The request the form sends (ADR 0086): every text trimmed and a blank optional one as `null`;
 * for Myself, the hidden email and permission are left out whatever they held.
 */
export function suggestionRequestOf(form: SuggestionForm): SuggestListingDto {
  const request: SuggestListingDto = {
    relation: form.relation,
    kind: form.kind,
    name: form.name.trim(),
    where: form.where.trim(),
    website: optional(form.website),
    churchConnection: optional(form.churchConnection),
    reason: optional(form.reason),
  };
  return suggestionFormOf(form.relation).asksContact
    ? { ...request, email: optional(form.email), mayTellWhoSuggested: form.mayTellWhoSuggested }
    : request;
}

/** The thanks once sent (L2-062 AC5): "Thanks, " and the member's first name, or "Thanks". */
export function thanksOf(name: string | null): string {
  const first = firstNameOf(name);
  return first ? `Thanks, ${first}` : 'Thanks';
}

/** Each field code the API refuses a suggestion with, and the sentence its field shows (ADR 0086). */
const FIELD_CODE_MESSAGES: Record<string, { field: SuggestionField; message: string }> = {
  name_required: { field: 'name', message: SUGGESTION_NAME_REQUIRED },
  name_too_long: { field: 'name', message: 'Use 120 characters or fewer.' },
  where_required: { field: 'where', message: SUGGESTION_WHERE_REQUIRED },
  where_too_long: { field: 'where', message: 'Use 120 characters or fewer.' },
  website_invalid: {
    field: 'website',
    message: 'Enter a web address that starts with https://, or leave it empty.',
  },
  website_too_long: { field: 'website', message: 'Use 200 characters or fewer.' },
  church_connection_too_long: {
    field: 'churchConnection',
    message: 'Use 200 characters or fewer.',
  },
  reason_too_long: { field: 'reason', message: 'Keep it to 1,000 characters.' },
  email_invalid: { field: 'email', message: 'Enter an email address like name@example.com' },
  email_too_long: { field: 'email', message: 'Use 254 characters or fewer.' },
};

/**
 * What the API's answer to a send means for the screen (L2-062 AC6 to AC8, AC11; ADR 0086): the
 * fields a 400 names, with their sentences; the daily limit; a suspended account; or a failure,
 * which is anything else, a field code the screen does not know included.
 */
export type SuggestionRefusal =
  | { kind: 'invalid'; errors: SuggestionFieldErrors }
  | { kind: 'limit' }
  | { kind: 'suspended' }
  | { kind: 'failed' };

export function suggestionRefusalOf(error: unknown): SuggestionRefusal {
  const api = typeof error === 'object' && error !== null ? (error as Partial<ApiError>) : {};
  if (api.code === 'too_many_attempts') return { kind: 'limit' };
  if (api.code === 'account_suspended') return { kind: 'suspended' };
  if (api.status === 400 && api.fieldCodes) {
    const errors: SuggestionFieldErrors = {};
    for (const code of Object.values(api.fieldCodes)) {
      const known = FIELD_CODE_MESSAGES[code];
      if (known) errors[known.field] = known.message;
    }
    if (Object.keys(errors).length > 0) return { kind: 'invalid', errors };
  }
  return { kind: 'failed' };
}
