import { expect, test, type ApiHandlers, type ApiReply } from '../fixtures/test';
import { WebApplyToBeListedDialog } from '../page-objects/web/apply-to-be-listed.dialog';
import { WebServicesPage } from '../page-objects/web/services.page';

const PATH = '/api/professional-applications';

const SENT = {
  role: 'Personal trainer',
  category: 'Training',
  credentials: 'NSCA-CPT, 8 years coaching',
  where: 'Mississauga',
  price: '$70 / session',
  about: 'I help busy parents build strength without burning out.',
};

/** The application as the API answers a create: the values, Pending, and when it was sent. */
const CREATED = {
  id: '0190c0de-0000-7000-8000-0000000a0001',
  ...SENT,
  status: 'pending',
  submittedAt: '2026-11-24T14:00:00Z',
};

function problem(status: number, code: string, errors?: Record<string, string[]>): ApiReply {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { type: 'about:blank', title: 'Refused', status, code, ...(errors ? { errors } : {}) },
  };
}

/** Answers each send with the next reply, and keeps every body sent. */
function answerSends(api: ApiHandlers, ...replies: ApiReply[]): { bodies: unknown[] } {
  const sent = { bodies: [] as unknown[] };
  api.on('POST', PATH, (request) => {
    sent.bodies.push(request.postDataJSON());
    return replies[Math.min(sent.bodies.length, replies.length) - 1];
  });
  return sent;
}

// L2-026 AC1 (ADR 0000): "Apply to be listed" on Services opens a dialog; a filled-in application is
// sent trimmed and the member is told it was sent (mock `default`, `success`).
test.describe('Member app, apply to be listed', () => {
  test('Services shows the Apply to be listed button, which opens the dialog on Role', async ({
    page,
  }) => {
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await expect(services.heading).toHaveText('Services');
    await expect(services.subtitle).toHaveText(
      'Christian professionals, each one checked and listed by our team.',
    );
    await services.applyButton.click();

    await expect(dialog.byRole()).toBeVisible();
    expect(await dialog.isModal()).toBe(true);
    await expect(dialog.title).toHaveText('Apply to be listed');
    await expect(dialog.byRole()).toHaveAccessibleDescription(
      'Share who you are and how you help members.',
    );
    await expect(dialog.role).toBeFocused();
    expect(await dialog.categoryOptions()).toEqual([
      'Training',
      'Nutrition',
      'Physio',
      'Coaching',
      'Counselling',
    ]);
    expect(await dialog.values()).toEqual({
      role: '',
      category: 'Training',
      credentials: '',
      where: '',
      price: '',
      about: '',
    });
    await expect(dialog.fieldHint('About')).toHaveText('A sentence or two for members');
    await expect(dialog.dialog).toContainText(
      'Our team reviews every application before anyone is listed.',
    );
    await expect(dialog.sendButton).toHaveText('Send application');
    await expect(dialog.cancelButton).toHaveText('Cancel');
  });

  test('Cancel, Close, Escape and the scrim each leave without sending, and focus returns to the button', async ({
    page,
    api,
  }) => {
    const sent = answerSends(api, { status: 201, json: CREATED });
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);
    await services.open();

    for (const leave of [
      () => dialog.cancelButton.click(),
      () => dialog.closeButton.click(),
      () => dialog.pressEscape(),
      () => dialog.clickScrim(),
    ]) {
      await services.applyButton.click();
      await expect(dialog.byRole()).toBeVisible();
      await dialog.role.fill('Typed, not sent');
      await leave();
      await expect(dialog.dialog).toHaveCount(0);
      await expect(services.applyButton).toBeFocused();
    }
    expect(sent.bodies).toEqual([]);
  });

  test(
    'a filled-in application is sent trimmed and the member is told it was sent',
    { tag: '@critical' },
    async ({ page, api }) => {
      const sent = answerSends(api, { status: 201, json: CREATED });
      const services = new WebServicesPage(page);
      const dialog = new WebApplyToBeListedDialog(page);

      await services.open();
      await services.applyButton.click();
      await dialog.fillValid();
      await dialog.role.fill('  Personal trainer ');
      await dialog.sendAndAwaitRequest();

      await expect(dialog.successTitle).toHaveText('Application sent');
      await expect(dialog.successText).toHaveText(
        "Thanks. Our team will review your application and you'll hear from us in your messages.",
      );
      await expect(dialog.success).toHaveAttribute('role', 'status');
      await expect(dialog.role).toHaveCount(0);
      expect(sent.bodies).toEqual([SENT]);

      await expect(dialog.sendButton).toHaveText('Done');
      await dialog.sendButton.click();
      await expect(dialog.dialog).toHaveCount(0);
      await expect(services.applyButton).toBeFocused();
      expect(sent.bodies).toHaveLength(1);
    },
  );
});

// L2-026 (ADR 0048): a blank role or credentials is named in the dialog and nothing is sent
// (mock `invalid`).
test.describe('Member app, apply to be listed: the dialog names each field to fix', () => {
  test('a blank role and credentials are named, nothing is sent, and typing clears each', async ({
    page,
    api,
  }) => {
    const sent = answerSends(api, { status: 201, json: CREATED });
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await services.applyButton.click();
    await dialog.where.fill('Mississauga');
    await dialog.price.fill('$70 / session');
    await dialog.about.fill('I help busy parents build strength without burning out.');
    await dialog.sendButton.click();

    await expect(dialog.alertTitle).toHaveText('Check your application');
    await expect(dialog.alert).toHaveAttribute('role', 'alert');
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.alertLinks).toHaveText([
      'Enter your role, such as Personal trainer',
      'Tell members about your credentials',
    ]);
    await expect(dialog.role).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.role).toHaveAccessibleDescription(
      'Enter your role, such as Personal trainer',
    );
    await expect(dialog.fieldError('Credentials')).toHaveText(
      'Tell members about your credentials',
    );
    await expect(dialog.where).not.toHaveAttribute('aria-invalid');
    expect(sent.bodies).toEqual([]);

    await dialog.alertLinks.first().click();
    await expect(dialog.role).toBeFocused();
    await dialog.role.fill('Personal trainer');
    await expect(dialog.role).not.toHaveAttribute('aria-invalid');
    await expect(dialog.fieldError('Role')).toHaveCount(0);
    await expect(dialog.alertLinks).toHaveText(['Tell members about your credentials']);
  });

  test('a role over 80 characters and an about over 300 are named', async ({ page, api }) => {
    const sent = answerSends(api, { status: 201, json: CREATED });
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await services.applyButton.click();
    await dialog.fillValid();
    await dialog.role.fill('r'.repeat(81));
    await dialog.about.fill('a'.repeat(301));
    await dialog.sendButton.click();

    await expect(dialog.alertLinks).toHaveText([
      'Use 80 characters or fewer',
      'Keep it to 300 characters',
    ]);
    expect(sent.bodies).toEqual([]);
  });
});

// L2-026 AC2 (ADR 0048): a second application while one is pending, a refused or an unanswered send
// keeps the dialog and every value with a generic message (mock `refused`, `failed`).
test.describe('Member app, apply to be listed: a send that does not go through', () => {
  test('a pending application is explained, and every value is kept', async ({ page, api }) => {
    const sent = answerSends(api, problem(409, 'application_pending'));
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await services.applyButton.click();
    await dialog.fillValid();
    await dialog.sendButton.click();

    await expect(dialog.alertTitle).toHaveText('You already have an application');
    await expect(dialog.alertText).toHaveText(
      'Our team is still reviewing it. You can apply again once it has been decided.',
    );
    await expect(dialog.alert).toBeFocused();
    await expect(dialog.byRole()).toBeVisible();
    expect(await dialog.values()).toEqual(SENT);
    await expect(dialog.sendButton).toBeEnabled();
    expect(sent.bodies).toHaveLength(1);
  });

  test("a suspended member's refusal and a server error show the generic message, never the server's words", async ({
    page,
    api,
  }) => {
    const sent = answerSends(
      api,
      problem(403, 'member_suspended', { role: ['<b>Server sentence</b>'] }),
      problem(503, 'server_error'),
      { status: 201, json: CREATED },
    );
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await services.applyButton.click();
    await dialog.fillValid();
    for (let attempt = 0; attempt < 2; attempt++) {
      await dialog.sendButton.click();
      await expect(dialog.alertTitle).toHaveText("Your application didn't send");
      await expect(dialog.alertText).toHaveText(
        'Nothing was lost. Check your connection and send it again.',
      );
      await expect(dialog.alert).toBeFocused();
      await expect(dialog.dialog).not.toContainText('Server sentence');
      expect(await dialog.values()).toEqual(SENT);
    }

    await dialog.sendButton.click();
    await expect(dialog.successTitle).toHaveText('Application sent');
    expect(sent.bodies).toHaveLength(3);
  });

  test('while sending, the fields hold still and nothing closes the dialog', async ({
    page,
    api,
  }) => {
    let answer!: () => void;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', PATH, async () => {
      await answered;
      return { status: 201, json: CREATED };
    });
    const services = new WebServicesPage(page);
    const dialog = new WebApplyToBeListedDialog(page);

    await services.open();
    await services.applyButton.click();
    await dialog.fillValid();
    await dialog.sendAndAwaitRequest();

    await expect(dialog.sendButton).toHaveText('Sending…');
    await expect(dialog.sendButton).toBeDisabled();
    await expect(dialog.sendButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.role).toHaveAttribute('readonly', '');
    await expect(dialog.credentials).toHaveAttribute('readonly', '');
    await expect(dialog.about).toHaveAttribute('readonly', '');
    await expect(dialog.category).toBeDisabled();
    await dialog.closeButton.click();
    await dialog.pressEscape();
    await dialog.clickScrim();
    await expect(dialog.byRole()).toBeVisible();

    answer();

    await expect(dialog.successTitle).toHaveText('Application sent');
  });
});
