/** How an event editor ended with a saved event (ADR 0026). */
export type EventSaveOutcome = 'created' | 'updated' | 'published';

/**
 * What the admin toast says once the editor has saved `title` (mocks `admin-toast/draft-saved`,
 * `changes-saved` and `success`): a new draft is not visible to members, a change is updated, and a
 * published event is live.
 */
export function eventSavedToast(
  title: string,
  outcome: EventSaveOutcome,
): { title: string; text: string } {
  switch (outcome) {
    case 'published':
      return {
        title: `${title} is live`,
        text: 'Members can register now. A group chat opens with the first registration.',
      };
    case 'updated':
      return { title: 'Changes saved', text: `${title} is updated.` };
    case 'created':
      return { title: 'Draft saved', text: `${title} isn't visible to members yet.` };
  }
}
