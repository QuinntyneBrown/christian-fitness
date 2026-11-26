import type { StorySectionName, StoryStatusName } from '@cf/api';
import { storySectionLabel } from './story-list';

/** A status action of the editor's bar (L2-069 AC2, AC3, AC5). */
export type StoryAction = 'submit' | 'return-to-draft' | 'publish' | 'update' | 'unpublish';

/** One button of the bar: its action, its words and whether it is the primary one. */
export interface StoryActionView {
  action: StoryAction;
  label: string;
  primary: boolean;
}

/**
 * The actions a status allows, in the bar's order, the primary last (L2-069 AC2, AC3, AC5; the
 * design's table): a Draft "Send for review" and "Publish now"; a story In review "Back to draft"
 * and "Approve & publish"; a Published story "Unpublish" and "Update". A Scheduled story has none
 * until journey 23 builds Unschedule (ADR 0097).
 */
export function storyActions(status: StoryStatusName): StoryActionView[] {
  switch (status) {
    case 'draft':
      return [
        { action: 'submit', label: 'Send for review', primary: false },
        { action: 'publish', label: 'Publish now', primary: true },
      ];
    case 'review':
      return [
        { action: 'return-to-draft', label: 'Back to draft', primary: false },
        { action: 'publish', label: 'Approve & publish', primary: true },
      ];
    case 'published':
      return [
        { action: 'unpublish', label: 'Unpublish', primary: false },
        { action: 'update', label: 'Update', primary: true },
      ];
    case 'scheduled':
      return [];
  }
}

/**
 * The toast after an action (L2-069 AC6; mock `admin-story-editor/approved`), by the action and
 * the status it was taken from; a story that went out names its section's feed.
 */
export function storyActionToast(
  action: StoryAction,
  from: StoryStatusName,
  section: StorySectionName | null,
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

/**
 * The message above the story when Publish is refused (L2-069 AC7; mock
 * `admin-story-editor/invalid`): it names what is missing, "Add a headline before publishing" or
 * "Add a section and a byline before publishing"; a refusal of another field asks to check the
 * marked fields.
 */
export function storyPublishProblem(fieldCodes: Record<string, string>): {
  title: string;
  text: string;
} {
  const missing = NEEDED.filter((n) => fieldCodes[n.field] === n.code).map((n) => n.words);
  if (missing.length === 0) {
    return {
      title: 'Check the marked fields before publishing',
      text: 'Change what is marked, then publish again.',
    };
  }
  const list =
    missing.length === 1
      ? missing[0]
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
  return {
    title: `Add ${list} before publishing`,
    text: 'A story needs a headline, some text, a section and a byline to go out.',
  };
}
