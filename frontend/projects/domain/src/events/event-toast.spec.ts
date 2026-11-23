import { eventSavedToast } from './event-toast';

// ADR 0026: the words of the toast after a save, one row per way the editor ends.
describe('eventSavedToast', () => {
  it.each([
    {
      outcome: 'created' as const,
      title: 'Draft saved',
      text: "Whole Life Retreat isn't visible to members yet.",
    },
    {
      outcome: 'updated' as const,
      title: 'Changes saved',
      text: 'Whole Life Retreat is updated.',
    },
    {
      outcome: 'published' as const,
      title: 'Whole Life Retreat is live',
      text: 'Members can register now. A group chat opens with the first registration.',
    },
  ])('says "$title" for $outcome', ({ outcome, title, text }) => {
    expect(eventSavedToast('Whole Life Retreat', outcome)).toEqual({ title, text });
  });
});
