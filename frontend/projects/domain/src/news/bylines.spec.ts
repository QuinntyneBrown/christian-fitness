import { bylineStoriesText } from './bylines';

// L2-077 AC1 (ADR 0093): how many stories use a byline, as the "Used by" column reads it.
describe('bylineStoriesText', () => {
  it.each<{ stories: number; expected: string }>([
    { stories: 0, expected: 'Not used yet' },
    { stories: 1, expected: '1 story' },
    { stories: 2, expected: '2 stories' },
    { stories: 1200, expected: '1,200 stories' },
  ])('$stories reads "$expected"', ({ stories, expected }) => {
    expect(bylineStoriesText(stories)).toBe(expected);
  });
});
