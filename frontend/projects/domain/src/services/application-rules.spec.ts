import {
  applicationRefusalOf,
  applicationRequestOf,
  validateApplication,
} from './application-rules';
import type { ApplicationForm } from './application-rules';

const valid: ApplicationForm = {
  role: 'Personal trainer',
  category: 'Training',
  credentials: 'NSCA-CPT',
  where: 'Mississauga',
  price: '$70 / session',
  about: 'I help busy parents.',
};

// L2-026: the same table as the API's SubmitApplicationValidatorTests, one case per row.
describe('validateApplication', () => {
  it.each<{ why: string; form: Partial<ApplicationForm>; expected: Record<string, string> }>([
    { why: 'valid', form: {}, expected: {} },
    {
      why: 'role blank',
      form: { role: ' ' },
      expected: { role: 'Enter your role, such as Personal trainer' },
    },
    { why: 'role 80', form: { role: 'r'.repeat(80) }, expected: {} },
    {
      why: 'role 81',
      form: { role: 'r'.repeat(81) },
      expected: { role: 'Use 80 characters or fewer' },
    },
    { why: 'role 80 once trimmed', form: { role: ` ${'r'.repeat(80)} ` }, expected: {} },
    {
      why: 'credentials blank',
      form: { credentials: '' },
      expected: { credentials: 'Tell members about your credentials' },
    },
    { why: 'credentials 200', form: { credentials: 'c'.repeat(200) }, expected: {} },
    {
      why: 'credentials 201',
      form: { credentials: 'c'.repeat(201) },
      expected: { credentials: 'Use 200 characters or fewer' },
    },
    {
      why: 'where blank',
      form: { where: '' },
      expected: { where: 'Enter where you work, such as Mississauga' },
    },
    { why: 'where 80', form: { where: 'w'.repeat(80) }, expected: {} },
    {
      why: 'where 81',
      form: { where: 'w'.repeat(81) },
      expected: { where: 'Use 80 characters or fewer' },
    },
    {
      why: 'price blank',
      form: { price: ' ' },
      expected: { price: 'Enter your price, such as $70 / session' },
    },
    { why: 'price 60', form: { price: 'p'.repeat(60) }, expected: {} },
    {
      why: 'price 61',
      form: { price: 'p'.repeat(61) },
      expected: { price: 'Use 60 characters or fewer' },
    },
    {
      why: 'about blank',
      form: { about: '' },
      expected: { about: 'Tell members a little about you' },
    },
    { why: 'about 300', form: { about: 'a'.repeat(300) }, expected: {} },
    {
      why: 'about 301',
      form: { about: 'a'.repeat(301) },
      expected: { about: 'Keep it to 300 characters' },
    },
  ])('$why', ({ form, expected }) => {
    expect(validateApplication({ ...valid, ...form })).toEqual(expected);
  });
});

describe('applicationRequestOf', () => {
  it('trims every value', () => {
    expect(applicationRequestOf({ ...valid, role: '  Personal trainer ', about: ' Hi\n' })).toEqual(
      { ...valid, about: 'Hi' },
    );
  });
});

describe('applicationRefusalOf', () => {
  it.each([
    {
      why: 'a pending application',
      error: { status: 409, code: 'application_pending' },
      expected: 'pending',
    },
    {
      why: 'a suspended member',
      error: { status: 403, code: 'member_suspended' },
      expected: 'failed',
    },
    { why: 'a refused field', error: { status: 400, code: 'field_too_long' }, expected: 'failed' },
    { why: 'no answer', error: { status: 0, code: 'network' }, expected: 'failed' },
    { why: 'not an ApiError', error: 'boom', expected: 'failed' },
  ])('$why', ({ error, expected }) => {
    expect(applicationRefusalOf(error)).toBe(expected);
  });
});
