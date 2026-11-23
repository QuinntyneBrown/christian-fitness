import { initialsOf } from './initials';

// The admin sidebar's avatar shows the signed-in staff member's initials (mock `admin__user-avatar`).
describe('initialsOf', () => {
  it.each([
    { why: 'a first and last name', name: 'Dana Reyes', expected: 'DR' },
    { why: 'three words', name: 'Rachel Ade Adeyemi', expected: 'RA' },
    { why: 'one word', name: 'Dana', expected: 'D' },
    { why: 'spaces around and between', name: '  dana   reyes ', expected: 'DR' },
    { why: 'lower case', name: 'grace thompson', expected: 'GT' },
    { why: 'accented letters', name: 'Élodie Ōta', expected: 'ÉŌ' },
    { why: 'a letter outside the basic plane', name: '𝒜da Lovelace', expected: '𝒜L' },
    { why: 'a blank name', name: '   ', expected: '' },
  ])('$why ("$name") is "$expected"', ({ name, expected }) => {
    expect(initialsOf(name)).toBe(expected);
  });
});
