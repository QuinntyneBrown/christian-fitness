import { emailErrorOf } from './email-rule';

const INVALID = 'Enter an email address like name@example.com';
// The email of 254 characters: 64 + "@" + 185 + ".org".
const EMAIL_254 = `${'g'.repeat(64)}@${'d'.repeat(185)}.org`;

// L2-044 AC5: the reset request's email rule, one case per row. The API's
// RequestPasswordResetValidator (backend/tests/ChristianFitness.Application.Tests/Account/
// RequestPasswordResetValidatorTests.cs) carries the same table (ADR 0008, ADR 0010).
describe('emailErrorOf', () => {
  it.each<{ why: string; email: string; expected: string | null }>([
    { why: 'valid', email: 'grace.thompson@gmail.com', expected: null },
    { why: 'blank', email: '', expected: INVALID },
    { why: 'white space', email: '   ', expected: INVALID },
    { why: 'no dot in the domain', email: 'grace.thompson@gmail', expected: INVALID },
    { why: 'a space', email: 'grace thompson@gmail.com', expected: INVALID },
    { why: 'two @', email: 'grace@@gmail.com', expected: INVALID },
    { why: 'nothing before @', email: '@gmail.com', expected: INVALID },
    { why: 'no @', email: 'grace.thompson.gmail.com', expected: INVALID },
    { why: 'spaces around it', email: ' grace@gmail.com ', expected: null },
    { why: '254', email: EMAIL_254, expected: null },
    { why: '255', email: `g${EMAIL_254}`, expected: INVALID },
  ])('$why', ({ email, expected }) => {
    expect(emailErrorOf(email)).toBe(expected);
  });
});
