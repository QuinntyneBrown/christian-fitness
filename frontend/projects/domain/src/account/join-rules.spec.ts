import {
  clearFieldError,
  errorSummaryOf,
  JOIN_FIELDS,
  validateJoin,
  type JoinFieldErrors,
} from './join-rules';
import type { JoinForm } from './join';

const NAME = 'Grace Thompson';
const EMAIL = 'grace.thompson@gmail.com';
const PASSWORD = 'abundantlife';
// The email of 254 characters: 64 + "@" + 185 + ".org".
const EMAIL_254 = `${'g'.repeat(64)}@${'d'.repeat(185)}.org`;

function form(fullName: string, email: string, password: string, homeChurch = ''): JoinForm {
  return { ageConfirmed: true, fullName, email, password, homeChurch, interests: [] };
}

// L2-003 AC3 and AC6: the Join rules, one case per row. The API's CreateAccountValidator
// (backend/tests/ChristianFitness.Application.Tests/Account/CreateAccountValidatorTests.cs)
// carries the same table (ADR 0008).
describe('validateJoin', () => {
  it.each<{ why: string; form: JoinForm; expected: JoinFieldErrors }>([
    {
      why: 'valid',
      form: form(NAME, EMAIL, PASSWORD, 'Grace Fellowship, Scarborough'),
      expected: {},
    },
    {
      why: 'name blank',
      form: form('', EMAIL, PASSWORD),
      expected: { fullName: 'Enter your name.' },
    },
    {
      why: 'name white space',
      form: form('   ', EMAIL, PASSWORD),
      expected: { fullName: 'Enter your name.' },
    },
    { why: 'name 100', form: form('n'.repeat(100), EMAIL, PASSWORD), expected: {} },
    {
      why: 'name 101',
      form: form('n'.repeat(101), EMAIL, PASSWORD),
      expected: { fullName: 'Use 100 characters or fewer' },
    },
    {
      why: 'name 100 once trimmed',
      form: form(`  ${'n'.repeat(100)} `, EMAIL, PASSWORD),
      expected: {},
    },
    {
      why: 'email blank',
      form: form(NAME, '', PASSWORD),
      expected: { email: 'Enter an email address like name@example.com' },
    },
    {
      why: 'email without a dot in the domain',
      form: form(NAME, 'grace.thompson@gmail', PASSWORD),
      expected: { email: 'Enter an email address like name@example.com' },
    },
    {
      why: 'email with a space',
      form: form(NAME, 'grace thompson@gmail.com', PASSWORD),
      expected: { email: 'Enter an email address like name@example.com' },
    },
    {
      why: 'email with two @',
      form: form(NAME, 'grace@@gmail.com', PASSWORD),
      expected: { email: 'Enter an email address like name@example.com' },
    },
    {
      why: 'email with nothing before @',
      form: form(NAME, '@gmail.com', PASSWORD),
      expected: { email: 'Enter an email address like name@example.com' },
    },
    {
      why: 'email with spaces around it',
      form: form(NAME, ' grace@gmail.com ', PASSWORD),
      expected: {},
    },
    { why: 'email 254', form: form(NAME, EMAIL_254, PASSWORD), expected: {} },
    {
      why: 'email 255',
      form: form(NAME, `g${EMAIL_254}`, PASSWORD),
      expected: { email: 'Use 254 characters or fewer' },
    },
    {
      why: 'password 7',
      form: form(NAME, EMAIL, 'abcdefg'),
      expected: { password: 'Use at least 8 characters' },
    },
    { why: 'password 8', form: form(NAME, EMAIL, 'abcdefgh'), expected: {} },
    { why: 'password 8 spaces, as typed', form: form(NAME, EMAIL, '        '), expected: {} },
    { why: 'home church blank', form: form(NAME, EMAIL, PASSWORD, ''), expected: {} },
    { why: 'home church 120', form: form(NAME, EMAIL, PASSWORD, 'c'.repeat(120)), expected: {} },
    {
      why: 'home church 121',
      form: form(NAME, EMAIL, PASSWORD, 'c'.repeat(121)),
      expected: { homeChurch: 'Use 120 characters or fewer' },
    },
  ])('$why', ({ form, expected }) => {
    expect(validateJoin(form)).toEqual(expected);
  });

  it('names every invalid field at once, in the order the form shows them', () => {
    const errors = validateJoin(form('', 'grace.thompson@gmail', 'abc', 'c'.repeat(121)));

    expect(Object.keys(errors)).toEqual(['fullName', 'email', 'password', 'homeChurch']);
    expect(JOIN_FIELDS.map((field) => field.key)).toEqual([
      'fullName',
      'email',
      'password',
      'homeChurch',
      'ageConfirmed',
    ]);
  });
});

// The error summary of the mock `invalid-fields`: one link per invalid field, in the form's order.
describe('errorSummaryOf', () => {
  it.each<{ errors: JoinFieldErrors; expected: { text: string; target: string }[] }>([
    { errors: {}, expected: [] },
    {
      errors: { password: 'Use at least 8 characters', fullName: 'Enter your name.' },
      expected: [
        { text: 'Enter your name.', target: 'f-name' },
        { text: 'Use at least 8 characters', target: 'f-password' },
      ],
    },
    {
      errors: { homeChurch: 'Use 120 characters or fewer', email: 'Use 254 characters or fewer' },
      expected: [
        { text: 'Use 254 characters or fewer', target: 'f-email' },
        { text: 'Use 120 characters or fewer', target: 'f-church' },
      ],
    },
  ])('lists $expected.length line(s)', ({ errors, expected }) => {
    expect(errorSummaryOf(errors)).toEqual(expected);
  });
});

// Editing a field clears its own error; the others stay until the next submit.
describe('clearFieldError', () => {
  const errors: JoinFieldErrors = {
    fullName: 'Enter your name.',
    email: 'Enter an email address like name@example.com',
  };

  it.each<{ field: 'fullName' | 'email' | 'password'; expected: JoinFieldErrors }>([
    { field: 'fullName', expected: { email: 'Enter an email address like name@example.com' } },
    { field: 'email', expected: { fullName: 'Enter your name.' } },
    { field: 'password', expected: errors },
  ])('editing $field', ({ field, expected }) => {
    expect(clearFieldError(errors, field)).toEqual(expected);
  });

  it('gives back the same object when the field had no error, so nothing re-renders', () => {
    expect(clearFieldError(errors, 'password')).toBe(errors);
  });
});
