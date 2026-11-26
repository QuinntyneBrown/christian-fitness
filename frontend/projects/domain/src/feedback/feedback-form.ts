import type { ApiError, FeedbackKind } from '@cf/api';

/** The icon each kind's card shows (mock `feedback/default`). */
export type FeedbackKindIcon = 'lightbulb' | 'bug' | 'pen' | 'heart';

/** One card of "What's it about?": the kind it sends, its label and its icon. */
export interface FeedbackKindOption {
  value: FeedbackKind;
  label: string;
  icon: FeedbackKindIcon;
}

/** The four kinds, in the mock's order (L2-063 AC3). */
export const FEEDBACK_KINDS: readonly FeedbackKindOption[] = [
  { value: 'idea', label: 'Idea', icon: 'lightbulb' },
  { value: 'problem', label: 'Something’s off', icon: 'bug' },
  { value: 'correction', label: 'Correction', icon: 'pen' },
  { value: 'thanks', label: 'Thanks', icon: 'heart' },
];

/** What the note asks for a kind, and its hint when the mock gives one. */
export interface FeedbackQuestion {
  question: string;
  hint: string | null;
}

const QUESTIONS: Record<FeedbackKind, FeedbackQuestion> = {
  idea: {
    question: 'What would make this better?',
    hint: 'For example: show which week of the plan each session is',
  },
  problem: { question: 'What happened?', hint: null },
  correction: {
    question: 'What should it say?',
    hint: 'The detail that’s wrong, and the right one if you know it',
  },
  thanks: { question: 'What’s been good?', hint: null },
};

/** The note's question for `kind` (L2-063 AC3; mock `default`, `broken`, `correction`). */
export function feedbackQuestionOf(kind: FeedbackKind): FeedbackQuestion {
  return QUESTIONS[kind];
}

/**
 * The kind the form starts with (L2-063 AC2, AC3): Correction when the address asks for it about a
 * story, as a story's "Send a correction" does; Idea otherwise.
 */
export function startingFeedbackKind(kind: string | null, about: string | null): FeedbackKind {
  return kind === 'correction' && about?.startsWith('story:') ? 'correction' : 'idea';
}

/** The sentence an empty note shows (L2-063 AC5). */
export const FEEDBACK_NOTE_REQUIRED = 'Tell us a little more first.';

/** The longest note the API stores (L2-063 AC8). */
export const FEEDBACK_NOTE_MAX = 2000;

/** The sentence a note over the limit shows, before sending or when the API refuses it. */
export const FEEDBACK_NOTE_TOO_LONG = 'Keep it to 2,000 characters.';

/**
 * What is wrong with the note before sending (L2-063 AC5, AC8): empty or only spaces, or over
 * 2,000 characters once trimmed; none when it can be sent.
 */
export function checkFeedbackNote(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === '') return FEEDBACK_NOTE_REQUIRED;
  return trimmed.length > FEEDBACK_NOTE_MAX ? FEEDBACK_NOTE_TOO_LONG : null;
}

/** The types a screenshot may be, as the picker's `accept` (L2-063 AC4). */
export const FEEDBACK_SCREENSHOT_TYPES = 'image/jpeg,image/png,image/webp';

/** The largest screenshot, in bytes (5 MB), as the API allows. */
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

/** The sentence a refused screenshot shows: what is allowed (L2-063 AC4). */
export const FEEDBACK_SCREENSHOT_INVALID = 'Use a JPEG, PNG or WebP image up to 5 MB';

/**
 * What is wrong with a chosen screenshot before it is sent (L2-063 AC4): a type other than JPEG,
 * PNG or WebP, or over 5 MB; none when it can be sent. The server checks its content again.
 */
export function checkFeedbackScreenshot(file: { type: string; size: number }): string | null {
  const allowed = FEEDBACK_SCREENSHOT_TYPES.split(',').includes(file.type);
  return allowed && file.size <= FEEDBACK_SCREENSHOT_MAX_BYTES ? null : FEEDBACK_SCREENSHOT_INVALID;
}

/**
 * Why a note was not sent, as the form shows it (L2-063 AC4, AC7, AC8, AC9; ADR 0109): the
 * hourly limit, a sentence on the note or the screenshot for a code that field shows, or a failure
 * for anything else. What the member wrote stays in every case.
 */
export type FeedbackRefusal =
  | { kind: 'limit' }
  | { kind: 'note'; message: string }
  | { kind: 'screenshot'; message: string }
  | { kind: 'failed' };

const NOTE_CODE_MESSAGES: Readonly<Record<string, string>> = {
  text_required: FEEDBACK_NOTE_REQUIRED,
  field_too_long: FEEDBACK_NOTE_TOO_LONG,
};

const SCREENSHOT_CODES: readonly string[] = ['image_too_large', 'image_type_not_allowed'];

export function feedbackRefusalOf(error: unknown): FeedbackRefusal {
  const api = typeof error === 'object' && error !== null ? (error as Partial<ApiError>) : {};
  if (api.code === 'too_many_attempts') return { kind: 'limit' };
  const fields = api.status === 400 ? (api.fieldCodes ?? {}) : {};
  const text = fields['text'];
  const message = text === undefined ? undefined : NOTE_CODE_MESSAGES[text];
  if (message !== undefined) return { kind: 'note', message };
  const screenshot = fields['screenshot'];
  if (screenshot !== undefined && SCREENSHOT_CODES.includes(screenshot)) {
    return { kind: 'screenshot', message: FEEDBACK_SCREENSHOT_INVALID };
  }
  return { kind: 'failed' };
}

/**
 * The route template of the member page a router snapshot shows (ADR 0109): the paths of the
 * matched routes from the root down, empty ones left out, such as `events/:id`.
 */
export function routeTemplateOf(paths: readonly (string | undefined)[]): string {
  return paths.filter((path): path is string => !!path).join('/');
}
