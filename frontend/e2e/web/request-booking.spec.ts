import { SIGNED_IN } from '../fixtures/api-handlers';
import { FakeChatHub } from '../fixtures/chat';
import { MESSAGES_NOW } from '../fixtures/conversations';
import {
  answerBooking,
  answerService,
  answerServices,
  DANIELLE,
  professionalMemberOf,
  type ServiceListingFixture,
} from '../fixtures/services';
import { expect, test } from '../fixtures/test';
import { WebEventChatPage } from '../page-objects/web/event-chat.page';
import { WebRequestBookingDialog } from '../page-objects/web/request-booking.dialog';
import { WebServiceDetailPage } from '../page-objects/web/service-detail.page';
import { WebServicesPage } from '../page-objects/web/services.page';

const WHEN = 'Weekday evenings after 6, or Saturday mornings';
const MESSAGE = "Hi Danielle, I'm getting back into strength training.";

// L2-014 AC3 to AC5 (slice 17.2; ADR 0000): Request a booking on a professional's card opens a dialog;
// the request is sent and the conversation starts (mock `default`, `invalid`, `busy`, `failed`, `success`).
test.describe('Member app, request a booking', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(MESSAGES_NOW);
  });

  test('the card beside the list opens the dialog on the kind, with the intro call chosen', async ({
    page,
    api,
  }) => {
    answerServices(api, [DANIELLE]);
    const services = new WebServicesPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await services.open();

    await services.requestButton.click();

    await expect(dialog.byRole()).toBeVisible();
    await expect(dialog.title).toHaveText('Request a booking');
    await expect(dialog.subtitle).toHaveText(
      'Danielle Okafor · Personal trainer · From $70 / session',
    );
    await expect(dialog.kind).toBeFocused();
    expect(await dialog.kindOptions()).toEqual([
      'One-on-one session',
      'Small-group session',
      'Free 15-minute intro call',
    ]);
    expect(await dialog.chosenKind()).toBe('Free 15-minute intro call');
    await expect(dialog.fieldHint('When works for you?')).toHaveText(
      'Days and times, in your own words',
    );
    await expect(dialog.field('Message')).toContainText('(optional)');
    await expect(dialog.sendButton).toHaveText('Send request');
  });

  test('a request is sent trimmed, success offers Go to messages, which opens the conversation', async ({
    page,
    api,
  }) => {
    answerService(api, [DANIELLE]);
    const sent = answerBooking(api);
    const hub = await FakeChatHub.install(
      page,
      api,
      { code: null, title: 'Danielle Okafor', memberId: SIGNED_IN.memberId },
      [],
    );
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    const chat = new WebEventChatPage(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();

    await dialog.kind.selectOption({ label: 'One-on-one session' });
    await dialog.when.fill(`  ${WHEN}  `);
    await dialog.message.fill(MESSAGE);
    await dialog.sendButton.click();

    await expect(dialog.title).toHaveText('Request sent');
    await expect(dialog.subtitle).toHaveText('Danielle Okafor · One-on-one session');
    await expect(dialog.successText).toHaveText(
      "Danielle will reply in your messages, usually within a day. We've started the conversation for you.",
    );
    expect(sent).toEqual([
      { listing: DANIELLE.id, body: { kind: 'one-on-one', when: WHEN, message: MESSAGE } },
    ]);

    await dialog.goToMessagesButton.click();

    await expect(dialog.dialog).toBeHidden();
    await expect(page).toHaveURL(`/messages/${professionalMemberOf(DANIELLE)}`);
    await expect(chat.chatTitle).toHaveText('Danielle Okafor');
    expect(hub.joined).toEqual([professionalMemberOf(DANIELLE)]);
  });

  test('Done closes the dialog and leaves the member on the listing; a blank message is left out', async ({
    page,
    api,
  }) => {
    answerService(api, [DANIELLE]);
    const sent = answerBooking(api);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();
    await dialog.when.fill('Saturdays');

    await dialog.sendButton.click();
    await expect(dialog.title).toHaveText('Request sent');
    await dialog.doneButton.click();

    await expect(dialog.dialog).toBeHidden();
    await expect(page).toHaveURL(`/services/${DANIELLE.id}`);
    expect(sent.map((one) => one.body)).toEqual([{ kind: 'intro-call', when: 'Saturdays' }]);
    await expect(detail.requestButton).toBeFocused();
  });

  test('a blank time is refused with the error summary and nothing is sent', async ({
    page,
    api,
  }) => {
    answerService(api, [DANIELLE]);
    const sent = answerBooking(api);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();
    await dialog.message.fill(MESSAGE);

    await dialog.sendButton.click();

    await expect(dialog.alertTitle).toHaveText("Add when you're free");
    await expect(dialog.alert).toHaveAttribute('role', 'alert');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveText(['Tell Danielle which days and times work for you']);
    await expect(dialog.when).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.fieldError('When works for you?')).toHaveText(
      'Tell Danielle which days and times work for you',
    );
    expect(sent).toEqual([]);

    await dialog.alertLinks.first().click();
    await expect(dialog.when).toBeFocused();
    await dialog.when.fill('Mondays');
    await expect(dialog.when).not.toHaveAttribute('aria-invalid');
    await dialog.sendButton.click();
    await expect(dialog.title).toHaveText('Request sent');
    expect(sent).toHaveLength(1);
  });

  test('while sending, the fields hold still and nothing closes the dialog', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerService(api, [DANIELLE]);
    answerBooking(api, [], held);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();
    await dialog.when.fill(WHEN);

    await dialog.sendButton.click();

    await expect(dialog.sendButton).toHaveText('Sending…');
    await expect(dialog.sendButton).toBeDisabled();
    await expect(dialog.sendButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.kind).toBeDisabled();
    await expect(dialog.when).toHaveAttribute('readonly', '');
    await expect(dialog.message).toHaveAttribute('readonly', '');
    await dialog.closeButton.click();
    await dialog.pressEscape();
    await expect(dialog.byRole()).toBeVisible();

    release();

    await expect(dialog.title).toHaveText('Request sent');
  });

  test("a request that doesn't send keeps the values and can be sent again", async ({
    page,
    api,
  }) => {
    answerService(api, [DANIELLE]);
    const sent = answerBooking(api, [{ status: 400, code: 'error' }]);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();
    await dialog.when.fill(WHEN);
    await dialog.message.fill(MESSAGE);

    await dialog.sendButton.click();

    await expect(dialog.alertTitle).toHaveText("Your request didn't send");
    await expect(dialog.alertText).toHaveText(
      'Nothing was lost. Check your connection and send it again.',
    );
    await expect(dialog.when).toHaveValue(WHEN);
    await expect(dialog.message).toHaveValue(MESSAGE);
    await expect(dialog.sendButton).toBeEnabled();

    await dialog.sendButton.click();

    await expect(dialog.title).toHaveText('Request sent');
    expect(sent).toHaveLength(2);
  });

  test("a professional who can't take requests is said so and the dialog stays", async ({
    page,
    api,
  }) => {
    answerService(api, [DANIELLE]);
    answerBooking(api, [{ status: 403, code: 'recipient_unavailable' }]);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);
    await detail.requestButton.click();
    await dialog.when.fill(WHEN);

    await dialog.sendButton.click();

    await expect(dialog.alertTitle).toHaveText("Your request didn't send");
    await expect(dialog.alertText).toHaveText("Danielle can't take booking requests right now.");
    await expect(dialog.byRole()).toBeVisible();
  });

  test('Cancel, Close, Escape and the scrim leave without sending', async ({ page, api }) => {
    answerService(api, [DANIELLE]);
    const sent = answerBooking(api);
    const detail = new WebServiceDetailPage(page);
    const dialog = new WebRequestBookingDialog(page);
    await detail.open(DANIELLE.id);

    for (const leave of [
      () => dialog.cancelButton.click(),
      () => dialog.closeButton.click(),
      () => dialog.pressEscape(),
      () => dialog.scrim.click({ position: { x: 8, y: 8 } }),
    ]) {
      await detail.requestButton.click();
      await expect(dialog.byRole()).toBeVisible();
      await leave();
      await expect(dialog.dialog).toBeHidden();
    }

    expect(sent).toEqual([]);
  });

  test('a listing that publishes a contact link offers no booking request', async ({
    page,
    api,
  }) => {
    const linked: ServiceListingFixture = { ...DANIELLE, hasContactLink: true };
    answerService(api, [linked]);
    const detail = new WebServiceDetailPage(page);
    await detail.open(linked.id);

    await expect(detail.contactButton).toBeVisible();
    await expect(detail.requestButton).toBeHidden();
  });
});
