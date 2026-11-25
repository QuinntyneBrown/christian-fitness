import type { InterestKey } from '@cf/api';
import { joinRequestOf, toggleInterest, welcomeOf, type JoinForm } from './join';

const FORM: JoinForm = {
  fullName: 'Grace Thompson',
  email: 'grace.thompson@gmail.com',
  password: 'abundantlife',
  homeChurch: 'Grace Fellowship, Scarborough',
  ageConfirmed: true,
  interests: ['running', 'strength'],
};

// L2-003 AC1 and AC4, L2-033 AC1: what the Join form sends. One case per row.
describe('joinRequestOf', () => {
  it.each([
    {
      homeChurch: 'Grace Fellowship, Scarborough',
      expected: 'Grace Fellowship, Scarborough',
      why: 'kept as typed',
    },
    {
      homeChurch: '  Grace Fellowship, Scarborough ',
      expected: 'Grace Fellowship, Scarborough',
      why: 'trimmed',
    },
    { homeChurch: '', expected: null, why: 'blank is none' },
    { homeChurch: '   ', expected: null, why: 'white space is none' },
  ])('home church "$homeChurch" is sent as $expected ($why)', ({ homeChurch, expected }) => {
    expect(joinRequestOf({ ...FORM, homeChurch })).toEqual({
      fullName: 'Grace Thompson',
      email: 'grace.thompson@gmail.com',
      password: 'abundantlife',
      homeChurch: expected,
      ageConfirmed: true,
      interests: ['running', 'strength'],
    });
  });

  it('sends the password exactly as typed', () => {
    expect(joinRequestOf({ ...FORM, password: ' spaced out ' }).password).toBe(' spaced out ');
  });
});

// The interest toggles: pressing adds or removes one key; the list keeps the mock's order.
describe('toggleInterest', () => {
  it.each<{ selected: InterestKey[]; key: InterestKey; expected: InterestKey[]; why: string }>([
    { selected: [], key: 'running', expected: ['running'], why: 'first press adds' },
    { selected: ['running'], key: 'running', expected: [], why: 'second press removes' },
    {
      selected: ['cycling'],
      key: 'strength',
      expected: ['strength', 'cycling'],
      why: 'kept in the order the form shows',
    },
    {
      selected: ['running', 'strength', 'cycling'],
      key: 'strength',
      expected: ['running', 'cycling'],
      why: 'removes only that key',
    },
  ])('$key on $selected gives $expected ($why)', ({ selected, key, expected }) => {
    expect(toggleInterest(selected, key)).toEqual(expected);
  });
});

// The Home stand-in's greeting (ADR 0007). One case per row.
describe('welcomeOf', () => {
  it.each([
    { name: 'Grace Thompson', expected: 'Welcome, Grace', why: 'first name of a full name' },
    { name: 'Grace', expected: 'Welcome, Grace', why: 'one name' },
    { name: '  Grace   Thompson ', expected: 'Welcome, Grace', why: 'spaces around' },
    { name: 'Mary-Kate O’Neil', expected: 'Welcome, Mary-Kate', why: 'hyphenated first name' },
    { name: '', expected: 'Welcome', why: 'empty' },
    { name: '   ', expected: 'Welcome', why: 'white space' },
    { name: null, expected: 'Welcome', why: 'not known yet' },
  ])('"$name" gives "$expected" ($why)', ({ name, expected }) => {
    expect(welcomeOf(name)).toBe(expected);
  });
});
