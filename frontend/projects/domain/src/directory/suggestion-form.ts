import type { ListingKind, SuggestListingDto, SuggestionRelation } from '@cf/api';
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
 * The fields to mark before sending (L2-062 AC4; ADR 0084): a blank name or place. Every other
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
 * The request the form sends (ADR 0084): every text trimmed and a blank optional one as `null`;
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
