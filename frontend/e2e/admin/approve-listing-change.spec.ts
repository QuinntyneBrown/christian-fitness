import { CAST_LISTED, EASTSIDE_WAITING, listedPage } from '../fixtures/admin-directory';
import type { ApiHandlers } from '../fixtures/api-handlers';
import { answerPhotos } from '../fixtures/directory';
import { expect, test } from '../fixtures/test';
import { ManageListingsPage } from '../page-objects/admin/manage-listings.page';

const LIST = '/api/admin/directory/suggestions';
const LISTED = '/api/admin/directory/listings';
const DECIDE = /^\/api\/admin\/directory\/listings\/([0-9a-f-]{36})\/change\/(approve|decline)$/;

/** Answers Suggestions (none) and Listed with `listed` and Eastside's waiting name. */
function answerListed(api: ApiHandlers): void {
  answerPhotos(api);
  api.on('GET', LIST, () => ({
    json: { waiting: 0, listed: 5, suggestions: [], next: null },
  }));
  api.on('GET', LISTED, () => ({
    json: listedPage([...CAST_LISTED.slice(0, 2), EASTSIDE_WAITING, ...CAST_LISTED.slice(2)]),
  }));
}

// L2-079 AC5 (journey 20; ADR 0095): staff approve or decline a name an owner asked for, from
// Listed (mocks `admin-listings/change-waiting` and `change-approved`).
test.describe('Admin app, a waiting listing name', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test(
    'Listed shows the waiting name under the live one; Approve makes it the name and a toast says so',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerListed(api);
      const decided: string[] = [];
      api.on('POST', DECIDE, (request) => {
        const [, id, decision] = DECIDE.exec(new URL(request.url()).pathname)!;
        decided.push(`${id} ${decision}`);
        return {
          json: {
            ...EASTSIDE_WAITING,
            name: 'Eastside Women’s Strength',
            pendingName: null,
            pendingKind: null,
          },
        };
      });
      const listings = new ManageListingsPage(page);

      await listings.open('?tab=listed');

      await expect(listings.listedChange('Eastside Ladies Who Lift')).toContainText(
        'New name waiting: Eastside Women’s Strength',
      );
      await expect(listings.listedChange('Christian Fitness')).toHaveCount(0);

      await listings.approveChangeButton('Eastside Ladies Who Lift').click();

      await expect(listings.toastTitle).toHaveText('Eastside Women’s Strength is the new name');
      await expect(listings.toastText).toHaveText('The directory shows it now.');
      expect(decided).toEqual([`${EASTSIDE_WAITING.id} approve`]);
      await expect(listings.listedRow('Eastside Women’s Strength')).toHaveCount(1);
      await expect(listings.listedChange('Eastside Women’s Strength')).toHaveCount(0);
    },
  );

  test('Decline keeps the live name, and a toast says the new one was declined', async ({
    page,
    api,
  }) => {
    answerListed(api);
    api.on('POST', DECIDE, () => ({
      json: { ...EASTSIDE_WAITING, pendingName: null, pendingKind: null },
    }));
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');

    await listings.declineChangeButton('Eastside Ladies Who Lift').click();

    await expect(listings.toastTitle).toHaveText('Kept Eastside Ladies Who Lift');
    await expect(listings.toastText).toHaveText('The new name was declined.');
    await expect(listings.listedChange('Eastside Ladies Who Lift')).toHaveCount(0);
  });

  test('A decision that does not go through says so, and the waiting name stays', async ({
    page,
    api,
  }) => {
    answerListed(api);
    api.on('POST', DECIDE, () => ({ abort: true }));
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');

    await listings.approveChangeButton('Eastside Ladies Who Lift').click();

    await expect(listings.alertToast.locator('.toast__title')).toHaveText(
      "We couldn't save that decision",
    );
    await expect(listings.alertToast.locator('.toast__text')).toHaveText(
      'Nothing changed. Try again in a moment.',
    );
    await expect(listings.listedChange('Eastside Ladies Who Lift')).toContainText(
      'New name waiting: Eastside Women’s Strength',
    );
    await expect(listings.approveChangeButton('Eastside Ladies Who Lift')).toBeEnabled();
  });
});
