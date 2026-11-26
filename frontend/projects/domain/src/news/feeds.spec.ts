import { feedlyUrl, storiesPerWeekText } from './feeds';

// L2-060 AC4 (ADR 0110): Open in Feedly carries the feed's address encoded, and each feed shows
// about how many stories it carries a week.
describe('feedlyUrl', () => {
  it.each([
    [
      'https://www.christian.fitness/feed',
      'https://feedly.com/i/subscription/feed/https%3A%2F%2Fwww.christian.fitness%2Ffeed',
    ],
    [
      'https://www.christian.fitness/faith-body/feed',
      'https://feedly.com/i/subscription/feed/https%3A%2F%2Fwww.christian.fitness%2Ffaith-body%2Ffeed',
    ],
    [
      'https://www.christian.fitness/feed?x=1&y=2',
      'https://feedly.com/i/subscription/feed/https%3A%2F%2Fwww.christian.fitness%2Ffeed%3Fx%3D1%26y%3D2',
    ],
  ])('encodes %s as one segment', (feed, expected) => {
    expect(feedlyUrl(feed)).toBe(expected);
  });
});

describe('storiesPerWeekText', () => {
  it.each([
    [20, '~20 a week'],
    [3.4, '~3 a week'],
    [3.5, '~4 a week'],
    [0, '~0 a week'],
    [-1, '~0 a week'],
  ])('words %s as %s', (count, expected) => {
    expect(storiesPerWeekText(count)).toBe(expected);
  });
});
