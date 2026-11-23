import { characterCount } from '../public-api';

describe('characterCount', () => {
  it.each([
    [0, 160, 'left', '160 characters left.'],
    [106, 160, 'left', '54 characters left.'],
    [159, 160, 'left', '1 character left.'],
    [160, 160, 'left', '0 characters left.'],
    [161, 160, 'over', '1 character over'],
    [172, 160, 'over', '12 characters over'],
  ] as const)('counts %i of %i as %s: "%s"', (length, max, kind, text) => {
    expect(characterCount(length, max)).toEqual({ kind, text });
  });
});
