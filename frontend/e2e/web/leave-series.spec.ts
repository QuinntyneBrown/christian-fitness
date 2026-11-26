import { expect, test } from '../fixtures/test';
import {
  answerSeriesDetail,
  answerSeriesLeave,
  COUCH_TO_5K_DETAIL,
  joinedOf,
} from '../fixtures/series';
import { WebEventSeriesPage } from '../page-objects/web/event-series.page';
import { WebLeaveSeriesDialog } from '../page-objects/web/leave-series.dialog';

/** Couch to 5K joined: a place at each of the five sessions to come and at the first, done. */
const JOINED = joinedOf(COUCH_TO_5K_DETAIL);

// L2-052 AC9 (ADR 0101): "Leave the series" confirms in a dialog that names the series and says how
// many places go back; focus starts on "Stay in the series"; a failure says so and changes nothing.
test.describe('Member app, leave a series', () => {
  test('Leave the series asks in a dialog that names the series and the places that go back', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [JOINED]);
    const left = answerSeriesLeave(api, [JOINED]);
    const series = new WebEventSeriesPage(page);
    const dialog = new WebLeaveSeriesDialog(page);
    await series.open(JOINED.id);

    await series.leaveButton.click();

    await expect(dialog.byRole()).toBeVisible();
    await expect(dialog.title).toHaveText('Leave the series?');
    await expect(dialog.subtitle).toHaveText('Couch to 5K Run Club · every Tuesday to May 26');
    await expect(dialog.text).toHaveText(
      "Your place at the 5 sessions still to come goes back to other members, and you leave the series' group chat. You can join again while places are left.",
    );
    await expect(dialog.stayButton).toBeFocused();
    await expect(dialog.leaveButton).toHaveText('Leave the series');
    expect(left).toEqual([]);
  });

  test('Confirming takes the member out and the page shows the series to join again', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [JOINED]);
    const left = answerSeriesLeave(api, [JOINED]);
    const series = new WebEventSeriesPage(page);
    const dialog = new WebLeaveSeriesDialog(page);
    await series.open(JOINED.id);
    await series.leaveButton.click();

    await dialog.leaveButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(left).toEqual([JOINED.id]);
    await expect(series.confirmed).toHaveCount(0);
    await expect(series.panelTitle).toHaveText('Sign up');
    await expect(series.spots).toHaveText('9 of 40 spots left');
    await expect(series.panelButton).toHaveText('Join the series');
  });

  for (const [how, act] of [
    ['Stay in the series', (dialog: WebLeaveSeriesDialog) => dialog.stayButton.click()],
    ['Escape', (dialog: WebLeaveSeriesDialog) => dialog.pressEscape()],
    ['Close', (dialog: WebLeaveSeriesDialog) => dialog.closeButton.click()],
  ] as const) {
    test(`${how} closes the dialog and changes nothing`, async ({ page, api }) => {
      answerSeriesDetail(api, [JOINED]);
      const left = answerSeriesLeave(api, [JOINED]);
      const series = new WebEventSeriesPage(page);
      const dialog = new WebLeaveSeriesDialog(page);
      await series.open(JOINED.id);
      await series.leaveButton.click();

      await act(dialog);

      await expect(dialog.dialog).toHaveCount(0);
      await expect(series.confirmed).toHaveText("You're in for every session");
      await expect(series.leaveButton).toBeFocused();
      expect(left).toEqual([]);
    });
  }

  test('While it leaves, both buttons are disabled and the second reads "Leaving…"', async ({
    page,
    api,
  }) => {
    answerSeriesDetail(api, [JOINED]);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    answerSeriesLeave(api, [JOINED], async () => {
      await held;
      return null;
    });
    const series = new WebEventSeriesPage(page);
    const dialog = new WebLeaveSeriesDialog(page);
    await series.open(JOINED.id);
    await series.leaveButton.click();

    await dialog.leaveButton.click();

    await expect(dialog.leaveButton).toHaveText('Leaving…');
    await expect(dialog.leaveButton).toBeDisabled();
    await expect(dialog.stayButton).toBeDisabled();
    release();
    await expect(dialog.dialog).toHaveCount(0);
  });

  test('A failure says so in the dialog and changes nothing', async ({ page, api }) => {
    answerSeriesDetail(api, [JOINED]);
    const left = answerSeriesLeave(api, [JOINED], (n) =>
      n === 0 ? { status: 503, json: { code: 'error' } } : null,
    );
    const series = new WebEventSeriesPage(page);
    const dialog = new WebLeaveSeriesDialog(page);
    await series.open(JOINED.id);
    await series.leaveButton.click();

    await dialog.leaveButton.click();

    await expect(dialog.alertTitle).toHaveText("We couldn't take you out of the series");
    await expect(dialog.alert).toContainText('You still have your place. Try again in a moment.');
    await expect(dialog.leaveButton).toBeEnabled();
    await dialog.stayButton.click();
    await expect(series.confirmed).toHaveText("You're in for every session");
    expect(left).toEqual([JOINED.id]);
  });
});
