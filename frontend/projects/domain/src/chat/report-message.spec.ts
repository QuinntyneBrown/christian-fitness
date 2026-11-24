import { reportOf, reportReasonFits, reportRefusalOf } from './report-message';

// L2-017 AC3 and AC5: the same table as the API's ReportMessageValidator, one case per row.
describe('reportOf', () => {
  it.each<{ why: string; reason: string; expected: string | null }>([
    { why: 'a reason', reason: 'Rude', expected: 'Rude' },
    { why: 'a reason with spaces round it', reason: '  Rude  ', expected: 'Rude' },
    { why: 'nothing typed', reason: '', expected: null },
    { why: 'only spaces', reason: '   ', expected: null },
  ])('$why', ({ reason, expected }) => {
    expect(reportOf(reason)).toEqual({ reason: expected });
  });
});

describe('reportReasonFits', () => {
  it.each<{ why: string; reason: string; expected: boolean }>([
    { why: '500 characters', reason: 'r'.repeat(500), expected: true },
    { why: '501 characters', reason: 'r'.repeat(501), expected: false },
    { why: '500 once trimmed', reason: ` ${'r'.repeat(500)} `, expected: true },
    { why: 'empty', reason: '', expected: true },
  ])('$why', ({ reason, expected }) => {
    expect(reportReasonFits(reason)).toBe(expected);
  });
});

describe('reportRefusalOf', () => {
  it.each<{ why: string; error: unknown; expected: string }>([
    {
      why: 'already reported',
      error: { status: 409, code: 'already_reported' },
      expected: 'already',
    },
    {
      why: 'message not found',
      error: { status: 404, code: 'message_not_found' },
      expected: 'failed',
    },
    {
      why: 'own message',
      error: { status: 403, code: 'cannot_report_own_message' },
      expected: 'failed',
    },
    { why: 'no answer', error: { status: 0, code: 'error' }, expected: 'failed' },
    { why: 'not an ApiError', error: new Error('boom'), expected: 'failed' },
    { why: 'nothing', error: undefined, expected: 'failed' },
  ])('$why', ({ error, expected }) => {
    expect(reportRefusalOf(error)).toBe(expected);
  });
});
