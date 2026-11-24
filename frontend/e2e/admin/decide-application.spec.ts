import {
  applicationQueue,
  APPLICATIONS_NOW,
  approved,
  CAST_APPLICATIONS,
  declined,
  decisionPath,
  refused,
} from '../fixtures/admin-applications';
import { expect, test } from '../fixtures/test';
import { DeclineApplicationDialog } from '../page-objects/admin/decline-application.dialog';
import { ManageServicesPage } from '../page-objects/admin/manage-services.page';

const QUEUE = '/api/admin/services/applications';
const [LENA, SAMUEL, HANNAH] = CAST_APPLICATIONS;
const REASON = 'We could not verify the CDO registration number you gave.';

// L2-025 AC2 and AC3 (slice 21.2; ADR 0000): staff approve or decline each pending application.
test.describe('Admin app, approving and declining applications', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(APPLICATIONS_NOW);
    api.on('GET', QUEUE, () => applicationQueue(CAST_APPLICATIONS));
  });

  // Mock admin-services/default and decided.
  test('each waiting application has Approve and Decline buttons named for its applicant', async ({
    page,
  }) => {
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.applications).toHaveCount(3);
    for (const { name } of CAST_APPLICATIONS) {
      await expect(services.approveButton(name)).toBeVisible();
      await expect(services.declineButton(name)).toBeVisible();
    }
  });

  test('approving says it is now listed, takes the buttons away and lowers the count', async ({
    page,
    api,
  }) => {
    const approvals: string[] = [];
    api.on('POST', decisionPath(LENA.id, 'approve'), () => {
      approvals.push(LENA.id);
      return approved(LENA.id);
    });
    const services = new ManageServicesPage(page);
    await services.open();

    await services.approveButton(LENA.name).click();

    await expect(services.decision(LENA.name)).toHaveText('Approved, now listed');
    await expect(services.decision(LENA.name)).toHaveAttribute('role', 'status');
    await expect(services.approveButton(LENA.name)).toHaveCount(0);
    await expect(services.declineButton(LENA.name)).toHaveCount(0);
    await expect(services.applicationsCount).toHaveText('2');
    // The two others still wait for a decision.
    await expect(services.approveButton(SAMUEL.name)).toBeVisible();
    await expect(services.approveButton(HANNAH.name)).toBeVisible();
    expect(approvals).toEqual([LENA.id]);
    // The button went away, so focus moves to what replaced it.
    await expect.poll(() => services.isFocused(services.decision(LENA.name))).toBe(true);
  });

  test('while an approval is on its way the card cannot be decided again', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('POST', decisionPath(LENA.id, 'approve'), async () => {
      await gate;
      return approved(LENA.id);
    });
    const services = new ManageServicesPage(page);
    await services.open();

    await services.approveButton(LENA.name).click();

    await expect(services.approveButton(LENA.name)).toHaveAttribute('aria-busy', 'true');
    await expect(services.approveButton(LENA.name)).toBeDisabled();
    await expect(services.declineButton(LENA.name)).toBeDisabled();
    release();
    await expect(services.decision(LENA.name)).toHaveText('Approved, now listed');
  });

  // Mock admin-services/failed.
  test('an approval that fails says so, leaves the application waiting and can be tried again', async ({
    page,
    api,
  }) => {
    const answers = [refused(500, 'error'), approved(LENA.id)];
    api.on('POST', decisionPath(LENA.id, 'approve'), () => answers.shift() ?? approved(LENA.id));
    const services = new ManageServicesPage(page);
    await services.open();

    await services.approveButton(LENA.name).click();

    await expect(services.alertTitle).toHaveText("Couldn't approve Lena Park, RD");
    await expect(services.alertText).toHaveText(
      "The server didn't respond. Nothing changed; try again.",
    );
    await expect(services.decision(LENA.name)).toHaveCount(0);
    await expect(services.applicationsCount).toHaveText('3');
    await expect(services.approveButton(LENA.name)).toBeEnabled();

    await services.approveButton(LENA.name).click();

    await expect(services.decision(LENA.name)).toHaveText('Approved, now listed');
    await expect(services.alert).toHaveCount(0);
  });

  test('approving what someone else already decided says so and shows the queue as it is', async ({
    page,
    api,
  }) => {
    let reloaded = false;
    api.on('GET', QUEUE, () => {
      const answer = applicationQueue(reloaded ? [SAMUEL, HANNAH] : CAST_APPLICATIONS);
      reloaded = true;
      return answer;
    });
    api.on('POST', decisionPath(LENA.id, 'approve'), () => refused(409, 'application_decided'));
    const services = new ManageServicesPage(page);
    await services.open();

    await services.approveButton(LENA.name).click();

    await expect(services.alertTitle).toHaveText('This application was already decided');
    await expect(services.alertText).toHaveText(
      'Someone else approved or declined it. The list shows where things stand now.',
    );
    await expect(services.applications).toHaveCount(2);
    await expect(services.card(LENA.name)).toHaveCount(0);
  });

  // Mock decline-application/default.
  test('Decline opens a dialog for that applicant with the reason field focused', async ({
    page,
  }) => {
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();

    await services.declineButton(LENA.name).click();

    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.title).toHaveText('Decline Lena Park, RD');
    await expect(dialog.subtitle).toHaveText('Sports dietitian · Registered Dietitian, CDO');
    await expect(dialog.reasonHint).toHaveText(
      'Staff keep this on file. The applicant is not sent it. 500 characters left.',
    );
    await expect(dialog.submitButton).toHaveText('Decline application');
    await expect.poll(() => dialog.isFocused(dialog.reason)).toBe(true);
  });

  // Mock decline-application/invalid.
  test('declining with no reason names the field, focuses the summary and sends nothing', async ({
    page,
    api,
  }) => {
    const sent: unknown[] = [];
    api.on('POST', decisionPath(LENA.id, 'decline'), (request) => {
      sent.push(request.postDataJSON());
      return declined(LENA.id);
    });
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill('   ');

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('1 thing to fix');
    await expect(dialog.alertLinks).toHaveText(['Write a reason for declining']);
    await expect(dialog.reasonError).toHaveText('Write a reason for declining');
    await expect(dialog.reason).toHaveAttribute('aria-invalid', 'true');
    await expect.poll(() => dialog.isFocused(dialog.alert)).toBe(true);
    expect(sent).toEqual([]);

    await dialog.reason.fill('x');

    await expect(dialog.reasonError).toHaveCount(0);
  });

  test('declining with a reason sends it trimmed, closes the dialog and marks the card declined', async ({
    page,
    api,
  }) => {
    const sent: unknown[] = [];
    api.on('POST', decisionPath(LENA.id, 'decline'), (request) => {
      sent.push(request.postDataJSON());
      return declined(LENA.id);
    });
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill(`  ${REASON}  `);

    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.decision(LENA.name)).toHaveText('Declined');
    await expect(services.declineButton(LENA.name)).toHaveCount(0);
    await expect(services.applicationsCount).toHaveText('2');
    expect(sent).toEqual([{ reason: REASON }]);
    await expect.poll(() => services.isFocused(services.decision(LENA.name))).toBe(true);
  });

  // Mock decline-application/busy.
  test('while the decline is on its way the field holds still and the dialog cannot be left', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('POST', decisionPath(LENA.id, 'decline'), async () => {
      await gate;
      return declined(LENA.id);
    });
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill(REASON);

    await dialog.submitButton.click();

    await expect(dialog.submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(dialog.submitButton).toHaveText('Declining…');
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.reason).toHaveAttribute('readonly', '');
    await dialog.pressEscape();
    await expect(dialog.dialog).toBeVisible();
    release();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.decision(LENA.name)).toHaveText('Declined');
  });

  // Mock decline-application/failed.
  test('a decline that fails says so, keeps the reason and can be sent again', async ({
    page,
    api,
  }) => {
    const answers = [refused(500, 'error'), declined(LENA.id)];
    api.on('POST', decisionPath(LENA.id, 'decline'), () => answers.shift() ?? declined(LENA.id));
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill(REASON);

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText("Couldn't decline the application");
    await expect(dialog.alertText).toHaveText(
      "The server didn't respond. Nothing was lost; try again.",
    );
    await expect(dialog.reason).toHaveValue(REASON);
    await expect(dialog.submitButton).toBeEnabled();

    await dialog.submitButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.decision(LENA.name)).toHaveText('Declined');
  });

  // Mock decline-application/refused.
  test('declining what someone else already decided says so and the queue is shown as it is', async ({
    page,
    api,
  }) => {
    let reloaded = false;
    api.on('GET', QUEUE, () => {
      const answer = applicationQueue(reloaded ? [SAMUEL, HANNAH] : CAST_APPLICATIONS);
      reloaded = true;
      return answer;
    });
    api.on('POST', decisionPath(LENA.id, 'decline'), () => refused(409, 'application_decided'));
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill(REASON);

    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('This application was already decided');
    await expect(dialog.alertText).toHaveText(
      'Someone else approved or declined it. Close this to see the queue as it is now.',
    );
    await dialog.cancelButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.applications).toHaveCount(2);
    await expect(services.card(LENA.name)).toHaveCount(0);
  });

  test('Cancel and Escape close the dialog without sending anything', async ({ page, api }) => {
    const sent: string[] = [];
    api.on('POST', decisionPath(LENA.id, 'decline'), () => {
      sent.push(LENA.id);
      return declined(LENA.id);
    });
    const services = new ManageServicesPage(page);
    const dialog = new DeclineApplicationDialog(page);
    await services.open();
    await services.declineButton(LENA.name).click();
    await dialog.reason.fill(REASON);

    await dialog.cancelButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.declineButton(LENA.name)).toBeFocused();
    await services.declineButton(LENA.name).click();
    await dialog.pressEscape();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.decision(LENA.name)).toHaveCount(0);
    expect(sent).toEqual([]);
  });
});
