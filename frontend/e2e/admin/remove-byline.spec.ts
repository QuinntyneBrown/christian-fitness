import {
  BYLINES,
  bylineList,
  bylineRefusal,
  type BylineFixture,
  CF_TEAM,
} from '../fixtures/admin-bylines';
import { expect, test, type ApiHandlers } from '../fixtures/test';
import { AdminBylinesPage } from '../page-objects/admin/bylines.page';
import { RemoveBylineDialog } from '../page-objects/admin/remove-byline.dialog';

const BASE = '/api/admin/stories/bylines';

/** CF Team with no stories, so it can be removed (mock `remove-byline/default`). */
const UNUSED_CF_TEAM: BylineFixture = { ...CF_TEAM, stories: 0 };

/** Answers the list with CF Team unused and the rest as the default mock, and counts the asks. */
function answerBylines(api: ApiHandlers): { asked: number } {
  const seen = { asked: 0 };
  api.on('GET', BASE, () => {
    seen.asked += 1;
    return bylineList([UNUSED_CF_TEAM, ...BYLINES.slice(1)]);
  });
  return seen;
}

// L2-077 AC6, AC7 (ADR 0094): a byline no story uses can be removed after a confirmation; one
// stories use says why it stays, with only Close.
test.describe('Admin app, removing a byline', () => {
  test('a byline no story uses is removed after Remove byline, with a toast', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const removed: string[] = [];
    api.on('DELETE', `${BASE}/${CF_TEAM.id}`, (request) => {
      removed.push(new URL(request.url()).pathname);
      return { status: 204 };
    });
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();

    await bylines.removeButton('CF Team').click();

    await expect(dialog.title).toHaveText('Remove CF Team?');
    await expect(dialog.text).toHaveText(
      'No story uses CF Team. Admins will no longer see it in the story editor.',
    );
    await expect(dialog.keepButton).toBeFocused();
    await dialog.removeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(removed).toEqual([`${BASE}/${CF_TEAM.id}`]);
    await expect(bylines.rows).toHaveCount(BYLINES.length - 1);
    expect((await bylines.rowTexts()).map(([name]) => name)).not.toContain('CF Team');
    await expect(bylines.toastTitle).toHaveText('Byline removed');
    await expect(bylines.toastText).toHaveText("CF Team is no longer in the story editor's list.");
  });

  test('Keep it closes the dialog with nothing sent and the byline kept', async ({ page, api }) => {
    answerBylines(api);
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();

    await bylines.removeButton('CF Team').click();
    await dialog.keepButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(bylines.rows).toHaveCount(BYLINES.length);
    await expect(bylines.removeButton('CF Team')).toBeFocused();
  });

  test('a byline stories use says why it stays, with only Close, and asks nothing', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();

    await bylines.removeButton('Marcus Bell').click();

    await expect(dialog.title).toHaveText("Can't remove Marcus Bell");
    await expect(dialog.subtitle).toHaveText(
      'A byline that stories use stays until they run under another.',
    );
    await expect(dialog.alertTitle).toHaveText('Marcus Bell is on 2 stories');
    await expect(dialog.alert).toContainText(
      'Choose another byline on each of them, then remove this one.',
    );
    await expect(dialog.alert).toHaveAttribute('role', 'status');
    await expect(dialog.footButtons).toHaveText(['Close']);
    await expect(dialog.footButtons).toBeFocused();
    await dialog.footButtons.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(bylines.rows).toHaveCount(BYLINES.length);
  });

  test('a byline on one story reads "is on 1 story"', async ({ page, api }) => {
    answerBylines(api);
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();

    await bylines.removeButton('Priya Raman').click();

    await expect(dialog.alertTitle).toHaveText('Priya Raman is on 1 story');
  });

  test('while the removal is on its way the button reads Removing… and Keep it holds', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('DELETE', `${BASE}/${CF_TEAM.id}`, async () => {
      await held;
      return { status: 204 };
    });
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();
    await bylines.removeButton('CF Team').click();

    await dialog.removeButton.click();

    await expect(dialog.removeButton).toHaveText('Removing…');
    await expect(dialog.removeButton).toBeDisabled();
    await expect(dialog.keepButton).toBeDisabled();
    await dialog.pressEscape();
    await expect(dialog.dialog).toBeVisible();
    release();
    await expect(dialog.dialog).toHaveCount(0);
  });

  test('a story that took the byline meanwhile is said in an alert, and Keep it reads the list again', async ({
    page,
    api,
  }) => {
    const seen = answerBylines(api);
    api.on('DELETE', `${BASE}/${CF_TEAM.id}`, () => bylineRefusal(409, 'byline_in_use'));
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();
    await bylines.removeButton('CF Team').click();

    await dialog.removeButton.click();

    await expect(dialog.alertTitle).toHaveText('A story now uses this byline');
    await expect(dialog.alert).toContainText(
      "Someone chose it while this was open. Change those stories' byline first.",
    );
    await expect(dialog.alert).toBeFocused();
    expect(seen.asked).toBe(1);
    await dialog.keepButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect.poll(() => seen.asked).toBe(2);
  });

  test('a removal with no answer says so and keeps the dialog to try again', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    api.on('DELETE', `${BASE}/${CF_TEAM.id}`, () => ({ abort: true }));
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();
    await bylines.removeButton('CF Team').click();

    await dialog.removeButton.click();

    await expect(dialog.alertTitle).toHaveText("Couldn't remove the byline");
    await expect(dialog.alert).toContainText(
      "The server didn't respond. Nothing was lost; try again.",
    );
    await expect(dialog.removeButton).toHaveText('Remove byline');
    await expect(dialog.removeButton).toBeEnabled();
  });

  test('a byline found gone closes the dialog and reads the list again', async ({ page, api }) => {
    const seen = answerBylines(api);
    api.on('DELETE', `${BASE}/${CF_TEAM.id}`, () => bylineRefusal(404, 'not_found'));
    const bylines = new AdminBylinesPage(page);
    const dialog = new RemoveBylineDialog(page);
    await bylines.open();
    await bylines.removeButton('CF Team').click();

    await dialog.removeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect.poll(() => seen.asked).toBe(2);
  });
});
