import type { OwnProfileDto } from '@cf/api';
import {
  bioHintOf,
  clearProfileError,
  goalsOf,
  profileFormOf,
  profileRefusalOf,
  profileRequestOf,
  profileSummaryOf,
  validateProfile,
  type ProfileFieldErrors,
  type ProfileForm,
} from './profile-rules';

const NAME = 'Grace Thompson';

function form(
  name: string,
  city: string | null,
  homeChurch: string | null,
  bio: string | null,
  goals: string[],
): ProfileForm {
  return {
    name,
    city: city ?? '',
    homeChurch: homeChurch ?? '',
    bio: bio ?? '',
    goals: goals.join('\n'),
    interests: [],
  };
}

// L2-006 AC3 and AC6: the Edit profile rules, one case per row. The API's UpdateProfileValidator
// (backend/tests/ChristianFitness.Application.Tests/Profiles/UpdateProfileValidatorTests.cs)
// carries the same table (ADR 0024).
describe('validateProfile', () => {
  it.each<{ why: string; form: ProfileForm; expected: ProfileFieldErrors }>([
    {
      why: 'valid',
      form: form(NAME, 'Toronto, ON', 'Grace Fellowship, Scarborough', 'Mom of two.', [
        'Half marathon in the fall',
      ]),
      expected: {},
    },
    { why: 'nothing optional given', form: form(NAME, null, null, null, []), expected: {} },
    {
      why: 'name blank',
      form: form('', null, null, null, []),
      expected: { name: 'Enter your name so people know who you are' },
    },
    {
      why: 'name white space',
      form: form('   ', null, null, null, []),
      expected: { name: 'Enter your name so people know who you are' },
    },
    { why: 'name 100', form: form('n'.repeat(100), null, null, null, []), expected: {} },
    {
      why: 'name 101',
      form: form('n'.repeat(101), null, null, null, []),
      expected: { name: 'Use 100 characters or fewer' },
    },
    {
      why: 'name 100 once trimmed',
      form: form(`  ${'n'.repeat(100)} `, null, null, null, []),
      expected: {},
    },
    { why: 'city 100', form: form(NAME, 'c'.repeat(100), null, null, []), expected: {} },
    {
      why: 'city 101',
      form: form(NAME, 'c'.repeat(101), null, null, []),
      expected: { city: 'Use 100 characters or fewer' },
    },
    { why: 'home church 120', form: form(NAME, null, 'h'.repeat(120), null, []), expected: {} },
    {
      why: 'home church 121',
      form: form(NAME, null, 'h'.repeat(121), null, []),
      expected: { homeChurch: 'Use 120 characters or fewer' },
    },
    { why: 'bio 300', form: form(NAME, null, null, 'b'.repeat(300), []), expected: {} },
    {
      why: 'bio 301',
      form: form(NAME, null, null, 'b'.repeat(301), []),
      expected: { bio: 'Keep your bio to 300 characters' },
    },
    {
      why: 'bio 300 once trimmed',
      form: form(NAME, null, null, ` ${'b'.repeat(300)}  `, []),
      expected: {},
    },
    { why: 'goal 80', form: form(NAME, null, null, null, ['g'.repeat(80)]), expected: {} },
    {
      why: 'goal 81',
      form: form(NAME, null, null, null, ['g'.repeat(81)]),
      expected: { goals: 'Keep each goal to 80 characters' },
    },
    {
      why: 'goal 80 once trimmed',
      form: form(NAME, null, null, null, [`  ${'g'.repeat(80)} `]),
      expected: {},
    },
    { why: '5 goals', form: form(NAME, null, null, null, ['a', 'b', 'c', 'd', 'e']), expected: {} },
    {
      why: '6 goals',
      form: form(NAME, null, null, null, ['a', 'b', 'c', 'd', 'e', 'f']),
      expected: { goals: 'Choose up to 5 goals' },
    },
    {
      why: '5 goals and blank lines',
      form: form(NAME, null, null, null, ['a', '', 'b', '  ', 'c', 'd', 'e']),
      expected: {},
    },
    {
      why: '6 goals, one over 80: the length is named',
      form: form(NAME, null, null, null, ['a', 'b', 'c', 'd', 'e', 'g'.repeat(81)]),
      expected: { goals: 'Keep each goal to 80 characters' },
    },
  ])('$why', ({ form, expected }) => {
    expect(validateProfile(form)).toEqual(expected);
  });
});

describe('goalsOf', () => {
  it.each<{ why: string; text: string; expected: string[] }>([
    { why: 'nothing', text: '', expected: [] },
    { why: 'one line', text: 'Sleep before 11', expected: ['Sleep before 11'] },
    { why: 'lines trimmed', text: ' a \n b', expected: ['a', 'b'] },
    { why: 'blank lines dropped', text: 'a\n\n  \nb\n', expected: ['a', 'b'] },
    { why: 'Windows line ends', text: 'a\r\nb', expected: ['a', 'b'] },
  ])('$why', ({ text, expected }) => {
    expect(goalsOf(text)).toEqual(expected);
  });
});

describe('bioHintOf', () => {
  it.each<{ why: string; bio: string; expected: string | undefined }>([
    { why: 'empty', bio: '', expected: 'A sentence or two. 300 characters left.' },
    {
      why: '106 characters',
      bio: 'b'.repeat(106),
      expected: 'A sentence or two. 194 characters left.',
    },
    {
      why: 'spaces around do not count',
      bio: `  ${'b'.repeat(10)} `,
      expected: 'A sentence or two. 290 characters left.',
    },
    { why: '300', bio: 'b'.repeat(300), expected: 'A sentence or two. 0 characters left.' },
    { why: '301: the error says it instead', bio: 'b'.repeat(301), expected: undefined },
  ])('$why', ({ bio, expected }) => {
    expect(bioHintOf(bio)).toBe(expected);
  });
});

describe('profileFormOf', () => {
  const profile: OwnProfileDto = {
    memberId: '0190c0de-0000-7000-8000-000000000001',
    name: NAME,
    city: null,
    joinedAt: '2026-01-14T15:30:00Z',
    bio: null,
    homeChurch: 'Grace Fellowship, Scarborough',
    showHomeChurch: true,
    goals: ['Half marathon in the fall', 'Sleep before 11'],
    interests: ['nutrition', 'parkour', 'running'],
    upcomingEvents: [],
  };

  it('gives the dialog the current values: none as empty, goals one per line', () => {
    expect(profileFormOf(profile)).toEqual({
      name: NAME,
      city: '',
      homeChurch: 'Grace Fellowship, Scarborough',
      bio: '',
      goals: 'Half marathon in the fall\nSleep before 11',
      // In the order the dialog shows them; a key the app does not know is left out.
      interests: ['running', 'nutrition'],
    });
  });
});

describe('profileRequestOf', () => {
  it('trims every value, sends a blank optional one as null and drops blank goal lines', () => {
    expect(
      profileRequestOf({
        name: '  Grace T. Thompson ',
        city: '  ',
        homeChurch: ' Grace Fellowship, Scarborough ',
        bio: '',
        goals: 'Half marathon in the fall\n\n  Sleep before 11 ',
        interests: ['running', 'cycling'],
      }),
    ).toEqual({
      name: 'Grace T. Thompson',
      city: null,
      homeChurch: 'Grace Fellowship, Scarborough',
      bio: null,
      goals: ['Half marathon in the fall', 'Sleep before 11'],
      interests: ['running', 'cycling'],
    });
  });
});

describe('profileSummaryOf', () => {
  it('lists each invalid field in the dialog’s order, linking to its control', () => {
    expect(
      profileSummaryOf({
        goals: 'Choose up to 5 goals',
        name: 'Enter your name so people know who you are',
        bio: 'Keep your bio to 300 characters',
      }),
    ).toEqual([
      { text: 'Enter your name so people know who you are', target: 'f-name' },
      { text: 'Keep your bio to 300 characters', target: 'f-bio' },
      { text: 'Choose up to 5 goals', target: 'f-goals' },
    ]);
  });
});

describe('clearProfileError', () => {
  it('clears the edited field’s error and keeps the others', () => {
    expect(clearProfileError({ name: 'x', bio: 'y' }, 'bio')).toEqual({ name: 'x' });
  });

  it('gives back the same errors when the field had none', () => {
    const errors = { name: 'x' };
    expect(clearProfileError(errors, 'goals')).toBe(errors);
  });
});

// L2-006 AC7: what the dialog shows for a failed save.
describe('profileRefusalOf', () => {
  it.each<{ why: string; error: unknown; expected: string }>([
    { why: 'too long', error: { status: 400, code: 'field_too_long' }, expected: 'refused' },
    { why: 'too many goals', error: { status: 400, code: 'too_many_goals' }, expected: 'refused' },
    { why: 'not yours', error: { status: 403, code: 'forbidden' }, expected: 'refused' },
    { why: 'signed out', error: { status: 401, code: 'unauthenticated' }, expected: 'refused' },
    { why: 'no answer', error: { status: 0, code: 'network' }, expected: 'failed' },
    { why: 'server error', error: { status: 500, code: 'server_error' }, expected: 'failed' },
    { why: 'unavailable', error: { status: 503, code: 'error' }, expected: 'failed' },
    { why: 'not an ApiError', error: new Error('boom'), expected: 'failed' },
  ])('$why', ({ error, expected }) => {
    expect(profileRefusalOf(error)).toBe(expected);
  });
});
