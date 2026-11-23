import { cancelEventText } from './cancel-event-text';

// ADR 0035: the confirmation names who sees the event cancelled, one row per count.
describe('cancelEventText', () => {
  it.each([
    {
      going: 0,
      text: "It leaves the Events list for members. Nobody has registered. This can't be undone.",
    },
    {
      going: 1,
      text: "It leaves the Events list for members. The 1 member registered sees it as cancelled on their Profile. This can't be undone.",
    },
    {
      going: 38,
      text: "It leaves the Events list for members. The 38 members registered see it as cancelled on their Profile. This can't be undone.",
    },
  ])('says who sees it for $going registered', ({ going, text }) => {
    expect(cancelEventText(going)).toBe(text);
  });
});
