import type { JoinFieldErrors } from './join-rules';
import { googleJoinRequestOf, validateGoogleJoin, type GoogleJoinForm } from './google-join';

const VALID: GoogleJoinForm = {
  ageConfirmed: true,
  fullName: 'Grace Thompson',
  homeChurch: '',
  interests: [],
};

// L2-003 AC3, AC6, AC8, AC12: "Finish your profile" checks what the email form checks, except the
// email and password it does not have. The API's CreateGoogleAccountValidator holds the same table.
describe('validateGoogleJoin', () => {
  it.each<{ why: string; form: GoogleJoinForm; expected: JoinFieldErrors }>([
    { why: 'a valid form', form: VALID, expected: {} },
    {
      why: 'a blank name',
      form: { ...VALID, fullName: '' },
      expected: { fullName: 'Enter your name.' },
    },
    {
      why: 'a name of spaces',
      form: { ...VALID, fullName: '   ' },
      expected: { fullName: 'Enter your name.' },
    },
    { why: 'a name of 100', form: { ...VALID, fullName: 'a'.repeat(100) }, expected: {} },
    {
      why: 'a name of 101',
      form: { ...VALID, fullName: 'a'.repeat(101) },
      expected: { fullName: 'Use 100 characters or fewer' },
    },
    {
      why: 'a home church of 121',
      form: { ...VALID, homeChurch: 'a'.repeat(121) },
      expected: { homeChurch: 'Use 120 characters or fewer' },
    },
    {
      why: 'no age confirmation',
      form: { ...VALID, ageConfirmed: false },
      expected: { ageConfirmed: "Confirm you're 16 or older to create a profile" },
    },
  ])('$why', ({ form, expected }) => {
    expect(validateGoogleJoin(form)).toEqual(expected);
  });
});

describe('googleJoinRequestOf', () => {
  it('sends the name as typed, a blank home church as none, and no email or password', () => {
    expect(
      googleJoinRequestOf({
        ...VALID,
        fullName: ' Grace ',
        homeChurch: '  ',
        interests: ['running'],
      }),
    ).toEqual({
      ageConfirmed: true,
      fullName: ' Grace ',
      homeChurch: null,
      interests: ['running'],
    });
  });

  it('trims the home church it sends', () => {
    expect(googleJoinRequestOf({ ...VALID, homeChurch: ' Grace Fellowship ' }).homeChurch).toBe(
      'Grace Fellowship',
    );
  });
});
