import {
  firstIssueText,
  fragmentTokenOf,
  isExpiredLink,
  SUBSCRIBE_EMAIL_INVALID,
  subscribeEmailErrorOf,
  subscribeRefusalOf,
} from './subscribe';

// L2-057 AC3 (ADR 0110): the same rows as the API's SubscribeTests, so both stacks refuse alike.
describe('subscribeEmailErrorOf', () => {
  it.each<[string, string | null, string]>([
    ['', SUBSCRIBE_EMAIL_INVALID, 'empty'],
    ['   ', SUBSCRIBE_EMAIL_INVALID, 'blank'],
    ['grace.thompson@gmail', SUBSCRIBE_EMAIL_INVALID, 'no dot in the domain'],
    ['grace thompson@gmail.com', SUBSCRIBE_EMAIL_INVALID, 'white space'],
    ['grace.thompson.gmail.com', SUBSCRIBE_EMAIL_INVALID, 'no @'],
    [`${'g'.repeat(243)}@example.org`, SUBSCRIBE_EMAIL_INVALID, 'over 254 characters'],
    [`${'g'.repeat(242)}@example.org`, null, 'at 254 characters'],
    ['  grace.thompson@gmail.com ', null, 'trimmed'],
    ['grace.thompson@gmail.com', null, 'a valid address'],
  ])('%j answers %j (%s)', (email, expected) => {
    expect(subscribeEmailErrorOf(email)).toBe(expected);
  });

  it('says what the requirement says', () => {
    expect(SUBSCRIBE_EMAIL_INVALID).toBe(
      "That email doesn't look right. Check for a typo and try again.",
    );
  });
});

// L2-057 AC3, AC6, AC7: a refusal marks the field, the rate limit says to try later, the rest fail.
describe('subscribeRefusalOf', () => {
  it.each([
    [{ status: 400, code: 'validation_failed' }, 'invalid'],
    [{ status: 429, code: 'too_many_attempts' }, 'limited'],
    [{ status: 500, code: 'error' }, 'failed'],
    [{ status: 503, code: 'validation_failed' }, 'failed'],
    [{ status: 0, code: 'network' }, 'failed'],
    [{ status: 400, code: 'antiforgery_failed' }, 'failed'],
    [new Error('boom'), 'failed'],
  ])('%j is %s', (failure, expected) => {
    expect(subscribeRefusalOf(failure)).toBe(expected);
  });
});

// L2-058 AC3: only the API's expired code shows "That link has expired".
describe('isExpiredLink', () => {
  it.each([
    [{ status: 400, code: 'subscription_link_expired' }, true],
    [{ status: 400, code: 'validation_failed' }, false],
    [{ status: 500, code: 'error' }, false],
    [null, false],
  ])('%j is %s', (failure, expected) => {
    expect(isExpiredLink(failure)).toBe(expected);
  });
});

// L2-058 AC7 (ADR 0110): the one token an emailed link carries in the fragment.
describe('fragmentTokenOf', () => {
  const token = 'Ab-_0123456789abcdefghijklmnopqrstuvwxyzABC';
  it.each([
    [`confirm=${token}`, { kind: 'confirm', token }],
    [`unsubscribe=${token}`, { kind: 'unsubscribe', token }],
    ['rss', null],
    ['', null],
    [null, null],
    ['confirm=', null],
    ['confirm=a b', null],
    [`confirm=${token}&unsubscribe=${token}`, null],
    [`token=${token}`, null],
  ])('%j reads %j', (fragment, expected) => {
    expect(fragmentTokenOf(fragment)).toEqual(expected);
  });
});

// L2-058 AC2: when the first issue arrives, in Toronto, whatever the browser's zone.
describe('firstIssueText', () => {
  it.each([
    ['2026-11-28T12:00:00Z', 'Saturday at 7 AM'],
    ['2026-03-14T11:00:00Z', 'Saturday at 7 AM'],
    ['2026-11-28T12:30:00Z', 'Saturday at 7:30 AM'],
    ['2026-11-28T19:00:00Z', 'Saturday at 2 PM'],
  ])('%s reads %s', (instant, expected) => {
    expect(firstIssueText(instant)).toBe(expected);
  });
});
