import { answerPreferences, GRACE_PREFERENCES } from '../fixtures/preferences';
import { expect, test } from '../fixtures/test';
import { PreferencesPage } from '../page-objects/web/preferences.page';

const REQUESTED = "Requested. We'll email you a link within 24 hours.";

// L2-066 AC1 and AC3 (journey 35; mocks preferences/default and download-requested): "Request
// download" in Your data records the request, and the confirmation stands in place of the button
// while the request is under 24 hours old.
test.describe('Member app, Preferences: download your data', () => {
  test(
    'Request download asks for the data once and shows the confirmation in place of the button',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerPreferences(api);
      const requests: string[] = [];
      api.on('POST', '/api/data-exports', (request) => {
        requests.push(request.postData() ?? '');
        return { json: { requestedAt: '2026-04-15T12:45:00Z' } };
      });
      const preferences = new PreferencesPage(page);
      await preferences.open();

      await expect(preferences.sectionLinks).toHaveText([
        'Email',
        'Notifications',
        'Privacy',
        'Suggestions',
        'Your data',
      ]);
      await expect(preferences.yourData.locator('.pref__sub')).toHaveText(
        'It’s yours. Take it with you or take it down.',
      );
      await expect(preferences.downloadRow.locator('.pref__legend')).toHaveText(
        'Download your data',
      );
      await expect(preferences.downloadRow.locator('.pref__desc')).toHaveText(
        'Your profile, events, messages and follows, as a .zip',
      );
      await expect(preferences.privacyPolicy).toHaveAttribute('href', '/privacy');
      await expect(preferences.downloadRequested).toHaveCount(0);

      await preferences.requestDownload.click();

      await expect(preferences.downloadRequested).toHaveText(REQUESTED);
      await expect(preferences.downloadRequested).toHaveAttribute('role', 'status');
      await expect(preferences.requestDownload).toHaveCount(0);
      expect(requests).toEqual(['']);
      // Asking for the data changes no setting: nothing waits to be saved.
      await expect(preferences.saveBar).toHaveCount(0);
    },
  );

  test('a download asked for in the last 24 hours shows the confirmation on arrival', async ({
    page,
    api,
  }) => {
    answerPreferences(api, { ...GRACE_PREFERENCES, downloadRequestedAt: '2026-04-15T09:00:00Z' });
    const preferences = new PreferencesPage(page);

    await preferences.open();

    await expect(preferences.downloadRequested).toHaveText(REQUESTED);
    await expect(preferences.requestDownload).toHaveCount(0);
  });

  test('a request that gets no answer says so, and Try again asks again', async ({ page, api }) => {
    answerPreferences(api);
    let fail = true;
    api.on('POST', '/api/data-exports', () =>
      fail ? { abort: true } : { json: { requestedAt: '2026-04-15T12:45:00Z' } },
    );
    const preferences = new PreferencesPage(page);
    await preferences.open();

    await preferences.requestDownload.click();

    await expect(preferences.downloadFailed).toContainText("Your download wasn't requested.");
    await expect(preferences.downloadFailed).toHaveAttribute('role', 'alert');
    await expect(preferences.requestDownload).toBeVisible();
    fail = false;
    await preferences.downloadFailed.getByRole('button', { name: 'Try again' }).click();
    await expect(preferences.downloadRequested).toHaveText(REQUESTED);
    await expect(preferences.downloadFailed).toHaveCount(0);
  });
});
