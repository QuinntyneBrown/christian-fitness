import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage, type JoinDetails } from '../page-objects/web/join.page';

const GRACE: JoinDetails = {
  fullName: 'Grace Thompson',
  email: 'grace.thompson@gmail.com',
  password: 'abundantlife',
  homeChurch: 'Grace Fellowship, Scarborough',
};

const SESSION = { memberId: '0190c0de-0000-7000-8000-000000000001', name: 'Grace Thompson' };

/** Answers each join with the next reply (the last one repeats) and records each body sent. */
function answerJoin(api: ApiHandlers, ...replies: ApiReply[]): unknown[] {
  const sent: unknown[] = [];
  api.on('POST', '/api/account/join', (request) => {
    sent.push(request.postDataJSON());
    return replies[Math.min(sent.length, replies.length) - 1]!;
  });
  api.on('GET', '/api/session', () => ({ json: SESSION }));
  return sent;
}

const CREATED: ApiReply = { status: 201, json: SESSION, headers: { location: '/api/session' } };

function problem(status: number, code: string, errors?: Record<string, string[]>): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { type: 'about:blank', title: 'Refused', status, code, ...(errors ? { errors } : {}) },
  };
}

// L2-003 AC3: the form names each invalid field and creates nothing (mock `invalid-fields`).
test.describe('Member app, join refusals: the form names each invalid field', () => {
  test('a missing name, a malformed email and a short password are each named, and nothing is sent', async ({
    page,
    api,
  }) => {
    const sent = answerJoin(api, CREATED);
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill({ fullName: '', email: 'grace.thompson@gmail', password: 'abc' });
    await join.submit();

    await expect(join.alertTitle).toHaveText('Check your details');
    await expect(join.alert).toHaveAttribute('role', 'alert');
    await expect(join.alert).toBeFocused();
    await expect(join.alertLinks).toHaveText([
      'Enter your name.',
      'Enter an email address like name@example.com',
      'Use at least 8 characters',
    ]);
    await expect(join.fullName).toHaveAttribute('aria-invalid', 'true');
    await expect(join.fullName).toHaveAccessibleDescription('Enter your name.');
    await expect(join.email).toHaveAttribute('aria-invalid', 'true');
    await expect(join.email).toHaveAccessibleDescription(
      'Enter an email address like name@example.com',
    );
    await expect(join.password).toHaveAttribute('aria-invalid', 'true');
    await expect(join.password).toHaveAccessibleDescription('Use at least 8 characters');
    await expect(join.fieldError('Password')).toHaveText('Use at least 8 characters');
    await expect(join.homeChurch).not.toHaveAttribute('aria-invalid');
    await expect(join.homeChurch).toHaveAccessibleDescription(
      'Optional — helps you find people nearby',
    );
    await expect(join.submitButton).toHaveText('Create profile');
    expect(sent).toEqual([]);
  });

  test('a link in the summary moves focus to its field, and editing a field clears its error', async ({
    page,
    api,
  }) => {
    answerJoin(api, CREATED);
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill({ fullName: '', email: 'grace.thompson@gmail', password: 'abc' });
    await join.submit();
    await join.alertLink('Use at least 8 characters').click();

    await expect(join.password).toBeFocused();
    expect(new URL(page.url()).pathname).toBe('/join');

    await join.fullName.fill('Grace Thompson');

    await expect(join.fullName).not.toHaveAttribute('aria-invalid');
    await expect(join.fieldError('Name')).toHaveCount(0);
    await expect(join.email).toHaveAttribute('aria-invalid', 'true');
    await expect(join.password).toHaveAttribute('aria-invalid', 'true');
  });

  test('once every field is fixed, the account is created', async ({ page, api }) => {
    const sent = answerJoin(api, CREATED);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await join.fill({ fullName: ' ', email: 'grace thompson@gmail.com', password: 'abcdefg' });
    await join.submit();
    await expect(join.alertLinks).toHaveCount(3);
    await join.fill(GRACE);
    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent).toHaveLength(1);
  });

  test('a name over 100 characters and a home church over 120 are named', async ({ page, api }) => {
    const sent = answerJoin(api, CREATED);
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill({ ...GRACE, fullName: 'n'.repeat(101), homeChurch: 'c'.repeat(121) });
    await join.submit();

    await expect(join.alertLinks).toHaveText([
      'Use 100 characters or fewer',
      'Use 120 characters or fewer',
    ]);
    await expect(join.homeChurch).toHaveAttribute('aria-invalid', 'true');
    await expect(join.homeChurch).toHaveAccessibleDescription('Use 120 characters or fewer');
    expect(sent).toEqual([]);
  });
});

const TAKEN = 'An account with this email already exists. Sign in instead?';
const REFUSED = "Some of your details weren't accepted. Check each field and try again.";
const FAILED =
  "Our servers didn't respond. Everything you typed is still here, so try again in a moment.";

// L2-003 AC2, L2-032 AC1 and the mock's `invalid`, `refused` and `error` states: what the API's
// answer puts on the screen. The form is given back with everything typed.
test.describe('Member app, join refusals: what the API answers', () => {
  test('a taken email is named on the email field with a way to sign in', async ({ page, api }) => {
    const sent = answerJoin(api, problem(409, 'email_taken'));
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill(GRACE);
    await join.choose('Running');
    await join.submitAndAwaitAnswer();

    await expect(join.fieldError('Email')).toHaveText(TAKEN);
    await expect(join.email).toHaveAttribute('aria-invalid', 'true');
    await expect(join.email).toHaveAccessibleDescription(TAKEN);
    await expect(join.fieldErrorLink('Email')).toHaveText('Sign in instead?');
    await expect(join.fieldErrorLink('Email')).toHaveAttribute('href', '/sign-in');
    await expect(join.alert).toHaveCount(0);
    await expect(join.submitButton).toHaveText('Create profile');
    await expect(join.submitButton).toBeEnabled();
    await expect(join.email).toHaveValue('grace.thompson@gmail.com');
    await expect(join.fullName).not.toHaveAttribute('readonly');
    await expect(join.interest('Running')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).pathname).toBe('/join');
    expect(sent).toHaveLength(1);
  });

  test('changing the taken email clears its message, and a new email creates the account', async ({
    page,
    api,
  }) => {
    const sent = answerJoin(api, problem(409, 'email_taken'), CREATED);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await join.fill(GRACE);
    await join.submitAndAwaitAnswer();
    await expect(join.fieldError('Email')).toHaveText(TAKEN);
    await join.email.fill('grace.t@gmail.com');

    await expect(join.fieldError('Email')).toHaveCount(0);
    await expect(join.email).not.toHaveAttribute('aria-invalid');

    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent).toHaveLength(2);
  });

  test("a body the API refuses shows the generic message, never the server's words", async ({
    page,
    api,
  }) => {
    answerJoin(
      api,
      problem(400, 'field_too_long', { fullName: ['<b>Server sentence</b> for fullName'] }),
    );
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill(GRACE);
    await join.submitAndAwaitAnswer();

    await expect(join.alertTitle).toHaveText('Check your details');
    await expect(join.alert).toContainText(REFUSED);
    await expect(join.alert).toBeFocused();
    await expect(join.alertLinks).toHaveCount(0);
    await expect(join.main).not.toContainText('Server sentence');
    await expect(join.fullName).toHaveValue('Grace Thompson');
    await expect(join.submitButton).toBeEnabled();
  });

  // L2-034 AC2: the sixth account from one address in an hour (mock `limited`, ADR 0012).
  test('too many new profiles from one network say so and keep the form', async ({ page, api }) => {
    const sent = answerJoin(api, problem(429, 'rate_limited'));
    const join = new WebJoinPage(page);

    await join.open();
    await join.fill(GRACE);
    await join.submitAndAwaitAnswer();

    await expect(join.alertTitle).toHaveText('Too many new profiles');
    await expect(join.alert).toContainText(
      'Too many profiles were made from this network in the last hour. Try again later.',
    );
    await expect(join.alert).toBeFocused();
    await expect(join.alertLinks).toHaveCount(0);
    await expect(join.fullName).toHaveValue('Grace Thompson');
    await expect(join.password).toHaveValue('abundantlife');
    await expect(join.submitButton).toBeEnabled();
    expect(new URL(page.url()).pathname).toBe('/join');
    expect(sent).toHaveLength(1);
  });

  test('a server error keeps the form and says the servers did not respond', async ({
    page,
    api,
  }) => {
    const sent = answerJoin(api, problem(503, 'server_error'), CREATED);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await join.fill(GRACE);
    await join.choose('Strength');
    await join.submitAndAwaitAnswer();

    await expect(join.alertTitle).toHaveText("We couldn't create your profile");
    await expect(join.alert).toContainText(FAILED);
    await expect(join.alert).toBeFocused();
    expect(new URL(page.url()).pathname).toBe('/join');
    await expect(join.heading).toHaveText('Create your profile');
    await expect(join.fullName).toHaveValue('Grace Thompson');
    await expect(join.password).toHaveValue('abundantlife');
    await expect(join.homeChurch).toHaveValue('Grace Fellowship, Scarborough');
    await expect(join.interest('Strength')).toHaveAttribute('aria-pressed', 'true');

    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent).toHaveLength(2);
  });
});

// L2-032 AC3: user-supplied text is shown as text, never as HTML.
test.describe('Member app, join: user text stays text', () => {
  test('a name holding markup is greeted as the characters typed', async ({ page, api }) => {
    const name = '<b>Grace</b> Thompson';
    api.on('POST', '/api/account/join', () => ({
      status: 201,
      json: { ...SESSION, name },
    }));
    api.on('GET', '/api/session', () => ({ json: { ...SESSION, name } }));
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await join.fill({ ...GRACE, fullName: name });
    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, <b>Grace</b>');
    await expect(home.greeting.locator('b')).toHaveCount(0);
  });
});
