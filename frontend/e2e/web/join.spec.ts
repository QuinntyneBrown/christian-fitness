import { expect, test, type ApiHandlers } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebJoinPage, type JoinDetails } from '../page-objects/web/join.page';

const GRACE: JoinDetails = {
  fullName: 'Grace Thompson',
  email: 'grace.thompson@gmail.com',
  password: 'abundantlife',
  homeChurch: 'Grace Fellowship, Scarborough',
};

const SESSION = { memberId: '0190c0de-0000-7000-8000-000000000001', name: 'Grace Thompson' };

/** Answers join with the new member's session and records each body the app sent. */
function answerJoin(api: ApiHandlers): unknown[] {
  const sent: unknown[] = [];
  api.on('POST', '/api/account/join', (request) => {
    sent.push(request.postDataJSON());
    return { status: 201, json: SESSION, headers: { location: '/api/session' } };
  });
  api.on('GET', '/api/session', () => ({ json: SESSION }));
  return sent;
}

// L2-003 AC1 and AC4, L2-033 AC1: a visitor joins with valid details and lands on Home signed in.
test.describe('Member app, join with valid details', () => {
  test('a visitor creates an account and lands on Home signed in', async ({ page, api }) => {
    const sent = answerJoin(api);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await expect.poll(() => join.title()).toBe('Join · Christian Fitness');
    await expect(join.heading).toHaveText('Create your profile');
    await join.fill(GRACE);
    await join.choose('Running', 'Strength');
    await expect(join.interest('Running')).toHaveAttribute('aria-pressed', 'true');
    await expect(join.interest('Basketball')).toHaveAttribute('aria-pressed', 'false');
    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    await expect.poll(() => home.title()).toBe('Home · Christian Fitness');
    expect(home.location()).toBe('/home');
    await expect(home.main).toHaveCount(1);
    expect(sent).toEqual([
      {
        fullName: 'Grace Thompson',
        email: 'grace.thompson@gmail.com',
        password: 'abundantlife',
        homeChurch: 'Grace Fellowship, Scarborough',
        interests: ['running', 'strength'],
      },
    ]);
  });

  test('shows the form the mock draws, with every interest unpressed', async ({ page }) => {
    const join = new WebJoinPage(page);

    await join.open();

    await expect(join.inputs).toHaveCount(4);
    await expect(join.password).toHaveAttribute('type', 'password');
    await expect(join.password).toHaveAccessibleDescription('At least 8 characters');
    await expect(join.homeChurch).toHaveAccessibleDescription(
      'Optional — helps you find people nearby',
    );
    await expect(join.interestLegend).toHaveText('What are you into?');
    await expect(join.interests).toHaveText([
      'Running',
      'Strength',
      'Basketball',
      'Walking groups',
      'Mobility',
      'Nutrition',
      'Cycling',
      'Retreats',
    ]);
    for (const interest of await join.interests.all()) {
      await expect(interest).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(join.submitButton).toHaveText('Create profile');
    await expect(join.signInLink).toHaveAttribute('href', '/sign-in');
  });

  test('a blank home church and no interests are sent as none', async ({ page, api }) => {
    const sent = answerJoin(api);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await join.fill({ ...GRACE, homeChurch: '   ' });
    await join.choose('Running', 'Running');
    await join.submit();

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent).toEqual([
      {
        fullName: 'Grace Thompson',
        email: 'grace.thompson@gmail.com',
        password: 'abundantlife',
        homeChurch: null,
        interests: [],
      },
    ]);
  });

  test('a visitor joins with the keyboard alone', async ({ page, api }) => {
    const sent = answerJoin(api);
    const join = new WebJoinPage(page);
    const home = new WebHomePage(page);

    await join.open();
    await expect(join.heading).toHaveText('Create your profile');
    await join.joinByKeyboard(GRACE, ['Strength', 'Cycling']);

    await expect(home.greeting).toHaveText('Welcome, Grace');
    expect(sent).toEqual([
      {
        fullName: 'Grace Thompson',
        email: 'grace.thompson@gmail.com',
        password: 'abundantlife',
        homeChurch: 'Grace Fellowship, Scarborough',
        interests: ['strength', 'cycling'],
      },
    ]);
  });
});
