import {
  approvalFailure,
  DECLINE_REASON_MAX,
  declineFailure,
  declineReasonProblem,
  decisionRefusalOf,
} from './application-decision';

// L2-025 AC3 (ADR 0000): a decline needs a reason of at most 500 characters once trimmed.
describe('declineReasonProblem', () => {
  it.each([
    { why: 'nothing', reason: '', expected: 'Write a reason for declining' },
    { why: 'only spaces', reason: '  \n ', expected: 'Write a reason for declining' },
    { why: 'one character', reason: 'x', expected: null },
    { why: 'the longest', reason: 'x'.repeat(DECLINE_REASON_MAX), expected: null },
    {
      why: 'the longest with spaces around it',
      reason: ` ${'x'.repeat(DECLINE_REASON_MAX)} `,
      expected: null,
    },
    {
      why: 'one over',
      reason: 'x'.repeat(DECLINE_REASON_MAX + 1),
      expected: 'Use 500 characters or fewer',
    },
  ])('$why gives $expected', ({ reason, expected }) => {
    expect(declineReasonProblem(reason)).toBe(expected);
  });
});

// Each refusal is its status and its code together; anything else is a failure.
describe('decisionRefusalOf', () => {
  it.each([
    { why: 'decided', error: { status: 409, code: 'application_decided' }, expected: 'decided' },
    { why: 'gone', error: { status: 404, code: 'application_not_found' }, expected: 'decided' },
    { why: 'a 409 of another code', error: { status: 409, code: 'other' }, expected: 'failed' },
    { why: 'a 500', error: { status: 500, code: 'error' }, expected: 'failed' },
    { why: 'the network', error: { status: 0, code: 'network' }, expected: 'failed' },
    { why: 'not an error', error: undefined, expected: 'failed' },
  ])('$why is $expected', ({ error, expected }) => {
    expect(decisionRefusalOf(error)).toBe(expected);
  });
});

describe('what staff are told', () => {
  it('names the applicant when an approval fails and when it was decided already', () => {
    expect(approvalFailure('failed', 'Lena Park, RD')).toEqual({
      heading: "Couldn't approve Lena Park, RD",
      text: "The server didn't respond. Nothing changed; try again.",
    });
    expect(approvalFailure('decided', 'Lena Park, RD')).toEqual({
      heading: 'This application was already decided',
      text: 'Someone else approved or declined it. The list shows where things stand now.',
    });
  });

  it('says what to do when a decline fails and when it was decided already', () => {
    expect(declineFailure('failed')).toEqual({
      heading: "Couldn't decline the application",
      text: "The server didn't respond. Nothing was lost; try again.",
    });
    expect(declineFailure('decided')).toEqual({
      heading: 'This application was already decided',
      text: 'Someone else approved or declined it. Close this to see the queue as it is now.',
    });
  });
});
