import { answerAsVisitor } from '../fixtures/claims';
import { answerEvent, SUNRISE_DETAIL } from '../fixtures/events';
import { expect, SIGNED_IN, test } from '../fixtures/test';
import { WebEventDetailPage } from '../page-objects/web/event-detail.page';
import { WebJoinPage } from '../page-objects/web/join.page';
import { WebSignInPage } from '../page-objects/web/sign-in.page';

const EVENT_PATH = `/events/${SUNRISE_DETAIL.id}`;
const RETURN = `returnUrl=${encodeURIComponent(EVENT_PATH)}`;

// L2-072 AC9 (ADR 0098): a Community Pick link `/e/<id>` lands a member on the event, and takes a
// visitor to Join, not Sign in (the exception to L2-004 AC6), and back to the event after joining
// or signing in; an event that is not published is not found.
test.describe('Member app, an event link', () => {
  test(
    'a signed-in member who opens /e/<id> lands on the event',
    { tag: '@critical' },
    async ({ page, api }) => {
      const asked = answerEvent(api, [SUNRISE_DETAIL]);
      const detail = new WebEventDetailPage(page);

      await detail.openLink(SUNRISE_DETAIL.id);

      await expect(detail.eventTitle).toHaveText('Easter Sunrise 5K');
      expect(detail.location()).toBe(EVENT_PATH);
      expect(asked).toEqual([SUNRISE_DETAIL.id]);
    },
  );

  test('a visitor is taken to Join, and joining brings them to the event', async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerEvent(api, [SUNRISE_DETAIL]);
    const detail = new WebEventDetailPage(page);
    const join = new WebJoinPage(page);

    await detail.openLink(SUNRISE_DETAIL.id);

    await expect(join.heading).toHaveText('Create your profile');
    expect(detail.location()).toBe(`/join?${RETURN}`);
    await expect(join.signInLink).toHaveAttribute('href', `/sign-in?${RETURN}`);

    await join.fill({
      fullName: 'Grace Thompson',
      email: 'grace.thompson@gmail.com',
      password: 'abundantlife',
    });
    await join.submit();

    await expect(detail.eventTitle).toHaveText('Easter Sunrise 5K');
    expect(detail.location()).toBe(EVENT_PATH);
  });

  test("a visitor who follows Join's Sign in is brought to the event after signing in", async ({
    page,
    api,
  }) => {
    answerAsVisitor(api, SIGNED_IN);
    answerEvent(api, [SUNRISE_DETAIL]);
    const detail = new WebEventDetailPage(page);
    const join = new WebJoinPage(page);
    const signIn = new WebSignInPage(page);
    await detail.openLink(SUNRISE_DETAIL.id);
    await expect(join.heading).toHaveText('Create your profile');

    await join.signInLink.click();
    await expect(signIn.heading).toHaveText('Welcome back');
    await signIn.fill('grace.thompson@gmail.com', 'abundantlife');
    await signIn.submit();

    await expect(detail.eventTitle).toHaveText('Easter Sunrise 5K');
    expect(detail.location()).toBe(EVENT_PATH);
  });

  test('a link to an event that is not published shows the not-found screen', async ({
    page,
    api,
  }) => {
    const asked = answerEvent(api, []);
    const detail = new WebEventDetailPage(page);

    await detail.openLink(SUNRISE_DETAIL.id);

    await expect(detail.heading).toHaveText('Page not found');
    await expect(detail.code).toHaveText('404');
    // The event page asked, and the API answered that no published event has this id.
    expect(asked).toEqual([SUNRISE_DETAIL.id]);
    expect(detail.location()).toBe(EVENT_PATH);
  });
});
