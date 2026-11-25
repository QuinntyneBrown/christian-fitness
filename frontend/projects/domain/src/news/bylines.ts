import type { ApiError, BylineDraftDto, BylineDto } from '@cf/api';

let countFormat: Intl.NumberFormat | undefined;

/** How many stories use a byline, as Bylines' "Used by" reads it (L2-077 AC1; ADR 0093). */
export function bylineStoriesText(stories: number): string {
  if (stories === 0) return 'Not used yet';
  if (stories === 1) return '1 story';
  countFormat ??= new Intl.NumberFormat('en-US');
  return `${countFormat.format(stories)} stories`;
}

/** What the byline editor's fields hold, as typed (mock `byline-editor/default`). */
export interface BylineEditorValues {
  name: string;
  bio: string;
  photoKey: string | null;
  /** The chosen photo's file name, once one is chosen on this visit. */
  photoName: string | null;
}

/** The editor's fields, by the names its errors use. */
export type BylineFieldKey = 'name' | 'bio' | 'photo';

/** The message under each refused field, by field. */
export type BylineFieldErrors = Partial<Record<BylineFieldKey, string>>;

/** The fields in the form's order, which is the error summary's, and each control's id. */
const FIELD_IDS: readonly (readonly [BylineFieldKey, string])[] = [
  ['name', 'f-name'],
  ['bio', 'f-bio'],
  ['photo', 'f-photo'],
];

/** What each field code says to Admins (ADR 0093); the sentences the server writes are never shown. */
const MESSAGES: Record<string, string> = {
  name_required: 'Add a name',
  name_too_long: 'Use 80 characters or fewer',
  bio_required: 'Add a short bio',
  bio_too_long: 'Use 200 characters or fewer',
  photo_invalid: 'Use a JPEG, PNG or WebP image up to 5 MB',
};

/** The server's field names, by the editor's: the photo is sent as `photoKey`, uploaded as `photo`. */
const FIELD_OF: Record<string, BylineFieldKey> = {
  name: 'name',
  bio: 'bio',
  photoKey: 'photo',
  photo: 'photo',
};

/** Add byline opens blank; Edit opens on the byline as it stands. */
export function bylineValuesOf(byline: BylineDto | null): BylineEditorValues {
  return {
    name: byline?.name ?? '',
    bio: byline?.bio ?? '',
    photoKey: byline?.photoKey ?? null,
    photoName: null,
  };
}

/** What a save sends: the values as typed; the API trims them. */
export function bylineDraftOf(values: BylineEditorValues): BylineDraftDto {
  return { name: values.name, bio: values.bio, photoKey: values.photoKey };
}

/** The required fields left blank (L2-077 AC3), so nothing is sent; `null` when both are there. */
export function bylineMissing(values: BylineEditorValues): BylineFieldErrors | null {
  const errors: BylineFieldErrors = {};
  if (values.name.trim() === '') errors.name = MESSAGES['name_required'];
  if (values.bio.trim() === '') errors.bio = MESSAGES['bio_required'];
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * The messages for the fields a save or an upload refused, or `null` when the failure is not a
 * field one: a name another byline has (409 `byline_name_taken`, L2-077 AC4) marks the name with
 * the name as typed; a 400 names each field by its code. Fields the editor lacks are ignored.
 */
export function bylineErrorsOf(error: unknown, name: string): BylineFieldErrors | null {
  const { status, code, fieldCodes } = (error ?? {}) as Partial<ApiError>;
  if (status === 409 && code === 'byline_name_taken') {
    return { name: `A byline called ${name.trim()} already exists` };
  }
  if (status !== 400 || !fieldCodes) return null;
  const errors: BylineFieldErrors = {};
  for (const [key, fieldCode] of Object.entries(fieldCodes)) {
    const field = FIELD_OF[key];
    if (field) errors[field] = MESSAGES[fieldCode] ?? 'Check this field';
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/** The refused fields as the error summary's lines, in the form's order. */
export function bylineErrorItems(
  errors: BylineFieldErrors,
): readonly { text: string; target: string }[] {
  return FIELD_IDS.flatMap(([field, target]) => {
    const text = errors[field];
    return text ? [{ text, target }] : [];
  });
}

/** The error summary's heading (mock `byline-editor/invalid`): "2 things to fix". */
export function bylineErrorHeading(count: number): string {
  return `${count} ${count === 1 ? 'thing' : 'things'} to fix`;
}

/** Whether a refused save or removal found the byline gone (404 `not_found`). */
export function bylineGone(error: unknown): boolean {
  const { status, code } = (error ?? {}) as Partial<ApiError>;
  return status === 404 && code === 'not_found';
}

/** Whether a save was refused because another byline has the name (409 `byline_name_taken`, L2-077 AC4). */
export function bylineNameTaken(error: unknown): boolean {
  const { status, code } = (error ?? {}) as Partial<ApiError>;
  return status === 409 && code === 'byline_name_taken';
}

/** Whether a removal was refused because a story now uses the byline (409 `byline_in_use`, L2-077 AC7). */
export function bylineInUse(error: unknown): boolean {
  const { status, code } = (error ?? {}) as Partial<ApiError>;
  return status === 409 && code === 'byline_in_use';
}

/** A byline's place in the list, as the API orders it: its name trimmed and lower-cased (ADR 0093). */
function keyOf(byline: BylineDto): string {
  return byline.name.trim().toLowerCase();
}

/** Ordinal, as the database orders `NameKey` and then `Id`. */
function ordinal(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** The list with `saved` in it, replacing the byline it was, in the API's order (L2-077 AC3, AC5). */
export function withByline(bylines: readonly BylineDto[], saved: BylineDto): BylineDto[] {
  return [...bylines.filter((b) => b.id !== saved.id), saved].sort(
    (a, b) => ordinal(keyOf(a), keyOf(b)) || ordinal(a.id, b.id),
  );
}

/** The list without the byline `id` (L2-077 AC6). */
export function withoutByline(bylines: readonly BylineDto[], id: string): BylineDto[] {
  return bylines.filter((b) => b.id !== id);
}
