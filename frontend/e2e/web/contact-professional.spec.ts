import type { Page } from '@playwright/test';
import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import { MESSAGES_NOW } from '../fixtures/conversations';
import {
  answerContactLink,
  answerConversation,
  answerService,
  answerServices,
  MARCUS,
  professionalMemberOf,
  type ServiceListingFixture,
} from '../fixtures/services';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebServiceDetailPage } from '../page-objects/web/service-detail.page';
import { WebServicesPage } from '../page-objects/web/services.page';

const LINKED: ServiceListingFixture = { ...MARCUS, hasContactLink: true };
const CONTACT_URL = 'https://marcus.example.org/book?ref=cf';

interface OpenedWindow {
  url: string;
  target: string;
  features: string;
}

/** Records `window.open` calls instead of opening a window, so no request leaves the machine. */
async function recordWindows(page: Page): Promise<() => Promise<OpenedWindow[]>> {
  await page.addInitScript(() => {
    const opened: OpenedWindow[] = [];
    (window as unknown as { __opened: OpenedWindow[] }).__opened = opened;
    window.open = (url, target, features) => {
      opened.push({ url: String(url), target: target ?? '', features: features ?? '' });
      return null;
    };
  });
  return () => page.evaluate(() => (window as unknown as { __opened: OpenedWindow[] }).__opened);
}

// L2-014 (slice 17.1; ADR 0000): Message opens the direct conversation; Contact opens the link.
test.describe('Member app, message or contact a professional', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test('Message on a listing opens the direct conversation with the professional and offers no Contact', async ({
    page,
    api,
  }) => {
    answerService(api, [MARCUS]);
    const asked = answerConversation(api);
    const professional = professionalMemberOf(MARCUS);
    const hub = await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Marcus Lee, RD', memberId: SIGNED_IN.memberId },
      [],
    );
    const detail = new WebServiceDetailPage(page);
    const chat = new WebEventChatPage(page);
    await detail.open(MARCUS.id);
    await expect(detail.contactButton).toBeHidden();
    expect(asked).toEqual([]);

    await detail.messageButton.click();

    await expect(page).toHaveURL(`/messages/${professional}`);
    await expect(chat.chatTitle).toHaveText('Marcus Lee, RD');
    await expect(chat.subtitle).toHaveText('Direct message');
    expect(asked).toEqual([MARCUS.id]);
    expect(hub.joined).toEqual([professional]);
  });

  test("Message on the card beside the list opens the professional's conversation", async ({
    page,
    api,
  }) => {
    answerServices(api, [MARCUS]);
    const asked = answerConversation(api);
    await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Marcus Lee, RD', memberId: SIGNED_IN.memberId },
      [],
    );
    const services = new WebServicesPage(page);
    await services.open();

    await services.messageButton.click();

    await expect(page).toHaveURL(`/messages/${professionalMemberOf(MARCUS)}`);
    expect(asked).toEqual([MARCUS.id]);
  });

  test('A listing with a contact link offers Contact, asks for the link only when pressed and opens it safely', async ({
    page,
    api,
  }) => {
    answerService(api, [LINKED]);
    const asked = answerContactLink(api, CONTACT_URL);
    const opened = await recordWindows(page);
    const detail = new WebServiceDetailPage(page);
    await detail.open(LINKED.id);
    await expect(detail.contactButton).toBeVisible();
    await expect(detail.messageButton).toBeHidden();
    expect(asked).toEqual([]);
    expect(await page.content()).not.toContain('marcus.example.org');

    await detail.contactButton.click();

    await expect
      .poll(opened)
      .toEqual([{ url: CONTACT_URL, target: '_blank', features: 'noopener,noreferrer' }]);
    expect(asked).toEqual([LINKED.id]);
    await expect(page).toHaveURL(`/services/${LINKED.id}`);
  });

  test('A link that is not http or https is never opened', async ({ page, api }) => {
    answerService(api, [LINKED]);
    answerContactLink(api, 'javascript:alert(1)');
    const opened = await recordWindows(page);
    const detail = new WebServiceDetailPage(page);
    await detail.open(LINKED.id);

    await detail.contactButton.click();

    await expect(detail.problem).toContainText("couldn't open that link");
    expect(await opened()).toEqual([]);
  });

  test("A professional who can't be messaged shows an alert and stays on the listing", async ({
    page,
    api,
  }) => {
    answerService(api, [MARCUS]);
    answerConversation(api, { status: 403, code: 'recipient_unavailable' });
    const detail = new WebServiceDetailPage(page);
    await detail.open(MARCUS.id);

    await detail.messageButton.click();

    await expect(detail.problem).toContainText("can't be messaged right now");
    await expect(page).toHaveURL(`/services/${MARCUS.id}`);
    await expect(detail.messageButton).toBeEnabled();
  });

  test('A failed request shows an alert and Message can be pressed again', async ({
    page,
    api,
  }) => {
    answerService(api, [MARCUS]);
    answerConversation(api, { status: 400, code: 'error' });
    const detail = new WebServiceDetailPage(page);
    await detail.open(MARCUS.id);

    await detail.messageButton.click();

    await expect(detail.problem).toContainText('Check your connection');
    await expect(detail.messageButton).toBeEnabled();
  });
});
