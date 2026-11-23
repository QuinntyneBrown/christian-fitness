import { interestLabelsOf } from './interest-labels';

// L2-005 AC1: the profile's interests read as the labels the member chose them by on Join.
describe('interestLabelsOf', () => {
  it.each<{ why: string; keys: string[]; expected: string[] }>([
    {
      why: 'known keys, in the order given',
      keys: ['running', 'strength', 'basketball', 'nutrition'],
      expected: ['Running', 'Strength', 'Basketball', 'Nutrition'],
    },
    { why: 'a two-word label', keys: ['walking-groups'], expected: ['Walking groups'] },
    {
      why: 'the order given, not the list order',
      keys: ['retreats', 'running'],
      expected: ['Retreats', 'Running'],
    },
    { why: 'an unknown key is left out', keys: ['running', 'skydiving'], expected: ['Running'] },
    { why: 'a key in another case is unknown', keys: ['Running'], expected: [] },
    { why: 'none', keys: [], expected: [] },
  ])('$why', ({ keys, expected }) => {
    expect(interestLabelsOf(keys)).toEqual(expected);
  });
});
