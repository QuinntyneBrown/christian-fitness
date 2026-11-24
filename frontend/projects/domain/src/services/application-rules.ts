import {
  type ApiError,
  SERVICE_CATEGORIES,
  type ServiceCategory,
  type SubmitApplicationDto,
} from '@cf/api';

/** What the Apply to be listed dialog holds while the member types (ADR 0000). */
export interface ApplicationForm {
  role: string;
  category: ServiceCategory;
  credentials: string;
  where: string;
  price: string;
  about: string;
}

/** The text fields a rule can name, in the order the dialog shows them. */
export type ApplicationField = 'role' | 'credentials' | 'where' | 'price' | 'about';

/** One message per invalid field; a valid field has no key. */
export type ApplicationFieldErrors = Partial<Record<ApplicationField, string>>;

/** The fields in the dialog's order, with the id of each control (the mock's `f-…` ids). */
export const APPLICATION_FIELDS: readonly { key: ApplicationField; fieldId: string }[] = [
  { key: 'role', fieldId: 'f-role' },
  { key: 'credentials', fieldId: 'f-credentials' },
  { key: 'where', fieldId: 'f-where' },
  { key: 'price', fieldId: 'f-price' },
  { key: 'about', fieldId: 'f-about' },
];

export const ROLE_MAX = 80;
export const CREDENTIALS_MAX = 200;
export const WHERE_MAX = 80;
export const PRICE_MAX = 60;
export const ABOUT_MAX = 300;

/** Each field's message when blank and when over its length: the API's `SubmitApplicationValidator` table. */
const RULES: Record<ApplicationField, { max: number; required: string; tooLong: string }> = {
  role: {
    max: ROLE_MAX,
    required: 'Enter your role, such as Personal trainer',
    tooLong: `Use ${ROLE_MAX} characters or fewer`,
  },
  credentials: {
    max: CREDENTIALS_MAX,
    required: 'Tell members about your credentials',
    tooLong: `Use ${CREDENTIALS_MAX} characters or fewer`,
  },
  where: {
    max: WHERE_MAX,
    required: 'Enter where you work, such as Mississauga',
    tooLong: `Use ${WHERE_MAX} characters or fewer`,
  },
  price: {
    max: PRICE_MAX,
    required: 'Enter your price, such as $70 / session',
    tooLong: `Use ${PRICE_MAX} characters or fewer`,
  },
  about: {
    max: ABOUT_MAX,
    required: 'Tell members a little about you',
    tooLong: `Keep it to ${ABOUT_MAX} characters`,
  },
};

/** An empty application: nothing typed, the first category chosen (the mock's default). */
export function emptyApplicationForm(): ApplicationForm {
  return {
    role: '',
    category: SERVICE_CATEGORIES[0],
    credentials: '',
    where: '',
    price: '',
    about: '',
  };
}

/**
 * The Apply to be listed rules (L2-026; ADR 0048): each invalid field's message, in the dialog's
 * order. The API's `SubmitApplicationValidator` checks the same table, so an application that
 * passes here is not refused there. Every field is required; lengths count the trimmed text.
 */
export function validateApplication(form: ApplicationForm): ApplicationFieldErrors {
  const errors: ApplicationFieldErrors = {};
  for (const { key } of APPLICATION_FIELDS) {
    const rule = RULES[key];
    const length = form[key].trim().length;
    if (length === 0) errors[key] = rule.required;
    else if (length > rule.max) errors[key] = rule.tooLong;
  }
  return errors;
}

/** The request the dialog sends: every value trimmed. */
export function applicationRequestOf(form: ApplicationForm): SubmitApplicationDto {
  return {
    role: form.role.trim(),
    category: form.category,
    credentials: form.credentials.trim(),
    where: form.where.trim(),
    price: form.price.trim(),
    about: form.about.trim(),
  };
}

/** The error summary's lines: one per invalid field, in the dialog's order, linking to its control. */
export function applicationSummaryOf(
  errors: ApplicationFieldErrors,
): { text: string; target: string }[] {
  return APPLICATION_FIELDS.flatMap(({ key, fieldId }) => {
    const text = errors[key];
    return text ? [{ text, target: fieldId }] : [];
  });
}

/** The errors after the member edits `field`: that field's error is cleared, the others stay. */
export function clearApplicationError(
  errors: ApplicationFieldErrors,
  field: ApplicationField,
): ApplicationFieldErrors {
  if (!(field in errors)) return errors;
  const rest = { ...errors };
  delete rest[field];
  return rest;
}

/**
 * What the dialog shows for a failed send (L2-026 AC2; ADR 0048): `pending` as "You already have an
 * application" (mock `refused`) for the code `application_pending`; `failed` as "Your application
 * didn't send" (mock `failed`) for any other refusal or no answer. The server's words are never shown.
 */
export type ApplicationRefusal = 'pending' | 'failed';

/** Branches on the error's `code`; anything that is not an `ApiError` is a failure. */
export function applicationRefusalOf(error: unknown): ApplicationRefusal {
  const code = typeof error === 'object' && error !== null ? (error as ApiError).code : undefined;
  return code === 'application_pending' ? 'pending' : 'failed';
}
