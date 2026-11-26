import type { ApiError } from '@cf/api';
import { apiErrorOf } from './api-error';

// L2-032 AC1 and AC4: what a service makes of a failed response. One case per row.
describe('apiErrorOf', () => {
  it.each<{ why: string; status: number; body: unknown; expected: ApiError }>([
    {
      why: 'a refusal with its code',
      status: 409,
      body: { status: 409, code: 'email_taken' },
      expected: { status: 409, code: 'email_taken' },
    },
    {
      why: 'a refused body with its field errors',
      status: 400,
      body: { code: 'field_too_long', errors: { fullName: ['Use 100 characters or fewer'] } },
      expected: {
        status: 400,
        code: 'field_too_long',
        errors: { fullName: ['Use 100 characters or fewer'] },
      },
    },
    {
      why: 'no answer at all',
      status: 0,
      body: new ProgressEvent('error'),
      expected: { status: 0, code: 'network' },
    },
    {
      why: 'a body with no code',
      status: 502,
      body: '<html>',
      expected: { status: 502, code: 'error' },
    },
    { why: 'no body', status: 500, body: null, expected: { status: 500, code: 'error' } },
    {
      why: 'a code that is not a string',
      status: 400,
      body: { code: 42 },
      expected: { status: 400, code: 'error' },
    },
    {
      why: 'errors that are not a map of lists of strings',
      status: 400,
      body: { code: 'validation_failed', errors: ['email'] },
      expected: { status: 400, code: 'validation_failed' },
    },
    {
      why: 'errors given as a list of lists',
      status: 400,
      body: { code: 'validation_failed', errors: [['Enter your full name']] },
      expected: { status: 400, code: 'validation_failed' },
    },
    {
      why: 'a refusal naming the Google account it was about (ADR 0099)',
      status: 404,
      body: { code: 'no_account', account: 'grace@gmail.com' },
      expected: { status: 404, code: 'no_account', account: 'grace@gmail.com' },
    },
    {
      why: 'an account that is not a string',
      status: 404,
      body: { code: 'no_account', account: { email: 'grace@gmail.com' } },
      expected: { status: 404, code: 'no_account' },
    },
  ])('$why', ({ status, body, expected }) => {
    expect(apiErrorOf(status, body)).toEqual(expected);
  });
});
