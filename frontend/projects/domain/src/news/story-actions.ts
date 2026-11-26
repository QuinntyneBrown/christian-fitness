import type { StorySectionName, StoryStatusName } from '@cf/api';
import { storySectionLabel, storyWhen } from './story-list';

/** A status action of the editor's bar (L2-069 AC2, AC3, AC4, AC5). */
export type StoryAction =
  'submit' | 'return-to-draft' | 'publish' | 'schedule' | 'unschedule' | 'update' | 'unpublish';

/** One button of the bar: its action, its words and whether it is the primary one. */
export interface StoryActionView {
  action: StoryAction;
  label: string;
  primary: boolean;
}

/**
 * The actions a status allows, in the bar's order, the primary last (L2-069 AC2 to AC5; the
 * design's table): a Draft "Send for review" and "Publish now"; a story In review "Back to draft"
 * and "Approve & publish"; with a date and time chosen (`scheduling`) the primary reads "Schedule"
 * or "Approve & schedule" instead. A Scheduled story "Unschedule" and "Publish now"; a Published
 * story "Unpublish" and "Update".
 */
export function storyActions(status: StoryStatusName, scheduling = false): StoryActionView[] {
  switch (status) {
    case 'draft':
      return [
        { action: 'submit', label: 'Send for review', primary: false },
        scheduling
          ? { action: 'schedule', label: 'Schedule', primary: true }
          : { action: 'publish', label: 'Publish now', primary: true },
      ];
    case 'review':
      return [
        { action: 'return-to-draft', label: 'Back to draft', primary: false },
        scheduling
          ? { action: 'schedule', label: 'Approve & schedule', primary: true }
          : { action: 'publish', label: 'Approve & publish', primary: true },
      ];
    case 'published':
      return [
        { action: 'unpublish', label: 'Unpublish', primary: false },
        { action: 'update', label: 'Update', primary: true },
      ];
    case 'scheduled':
      return [
        { action: 'unschedule', label: 'Unschedule', primary: false },
        { action: 'publish', label: 'Publish now', primary: true },
      ];
  }
}

/**
 * The toast after an action (L2-069 AC6; mock `admin-story-editor/approved`), by the action and
 * the status it was taken from; a story that went out names its section's feed, and a scheduled
 * one its time in Toronto (`publishAt`, worded against `now`).
 */
export function storyActionToast(
  action: StoryAction,
  from: StoryStatusName,
  section: StorySectionName | null,
  publishAt: string | null = null,
  now: Date = new Date(),
): { title: string; text: string } {
  const where = storySectionLabel(section);
  const out = where
    ? `It is on the front page and in the ${where} feed.`
    : 'It is on the front page and in the All stories feed.';
  switch (action) {
    case 'submit':
      return { title: 'Sent for review', text: 'It waits under In review on Stories.' };
    case 'return-to-draft':
      return { title: 'Back to draft', text: 'It is a Draft again. No one was told.' };
    case 'publish':
      return { title: from === 'review' ? 'Approved and published' : 'Published', text: out };
    case 'schedule':
      return {
        title: from === 'review' ? 'Approved and scheduled' : 'Scheduled',
        text: publishAt
          ? `It goes out ${storyWhen('scheduled', publishAt, now)}.`
          : 'It goes out at the time chosen.',
      };
    case 'unschedule':
      return { title: 'Unscheduled', text: 'It is a Draft again and will not go out.' };
    case 'update':
      return { title: 'Update published', text: 'Readers see the changes now.' };
    case 'unpublish':
      return {
        title: 'Unpublished',
        text: 'It is a Draft again, off the front page, the feeds and its address.',
      };
  }
}

/** The fields Publish needs, in the order the message names them, with their words. */
const NEEDED: readonly { field: string; code: string; words: string }[] = [
  { field: 'headline', code: 'headline_required', words: 'a headline' },
  { field: 'text', code: 'text_required', words: 'some text' },
  { field: 'section', code: 'section_required', words: 'a section' },
  { field: 'bylineId', code: 'byline_required', words: 'a byline' },
];

/** What Schedule needs besides (L2-069 AC7; ADR 0104). */
const NEEDED_TO_SCHEDULE: readonly { field: string; code: string; words: string }[] = [
  ...NEEDED,
  { field: 'publishDate', code: 'publish_date_required', words: 'a date' },
  { field: 'publishTime', code: 'publish_time_required', words: 'a time' },
];

/**
 * The message above the story when Publish or Schedule (`scheduling`) is refused (L2-069 AC7; mock
 * `admin-story-editor/invalid`): it names what is missing, "Add a headline before publishing" or
 * "Add a date and a time before scheduling"; a time not after now asks for one; a refusal of
 * another field asks to check the marked fields.
 */
export function storyPublishProblem(
  fieldCodes: Record<string, string>,
  scheduling = false,
): {
  title: string;
  text: string;
} {
  const verb = scheduling ? 'scheduling' : 'publishing';
  const needed = scheduling ? NEEDED_TO_SCHEDULE : NEEDED;
  const missing = needed.filter((n) => fieldCodes[n.field] === n.code).map((n) => n.words);
  if (missing.length === 0) {
    if (scheduling && fieldCodes['publishDate'] === 'publish_at_in_past') {
      return {
        title: 'Choose a time after now',
        text: 'A scheduled story goes out at a date and time still to come.',
      };
    }
    return {
      title: `Check the marked fields before ${verb}`,
      text: `Change what is marked, then ${scheduling ? 'schedule' : 'publish'} again.`,
    };
  }
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
  return {
    title: `Add ${list} before ${verb}`,
    text: scheduling
      ? 'A story needs a headline, some text, a section, a byline, a date and a time to be scheduled.'
      : 'A story needs a headline, some text, a section and a byline to go out.',
  };
}
