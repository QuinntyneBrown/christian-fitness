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
      'Enter your full name',
      'Enter an email address like name@example.com',
      'Use at least 8 characters',
    ]);
    await expect(join.fullName).toHaveAttribute('aria-invalid', 'true');
    await expect(join.fullName).toHaveAccessibleDescription('Enter your full name');
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
    await expect(join.fieldError('Full name')).toHaveCount(0);
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
