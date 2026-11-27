import type { ApiHandlers } from '../fixtures/api-handlers';
import { expect, test } from '../fixtures/test';
import { DownloadPage } from '../page-objects/web/download.page';

const ID = '0190c0de-0000-7000-8000-00000000d0a1';
const LINK = `/api/data-exports/${ID}`;
const ARCHIVE = `${LINK}/archive`;
const ZIP = Buffer.from('PK\u0005\u0006' + '\u0000'.repeat(18), 'binary');

/** Answers the archive as the API does: a private .zip attachment. Returns how often it was asked. */
function answerArchive(api: ApiHandlers): () => number {
  let asked = 0;
  api.on('GET', ARCHIVE, () => {
    asked += 1;
    return {
      body: ZIP,
      headers: {
        'content-type': 'application/zip',
        'content-disposition': 'attachment; filename="christian-fitness-data.zip"',
      },
    };
  });
  return () => asked;
}

// L2-066 AC2 (journey 35; mock download/default, loading, expired, error): the emailed link opens
// the download page in the member shell, which starts the download of the member's own archive and
// says until when the link works; a link the API does not answer for is expired.
test.describe('Member app, Download your data', () => {
  test('the link starts the download, says until when it works and offers it again', async ({
    page,
    api,
  }) => {
    api.on('GET', LINK, () => ({ json: { expiresAt: '2026-04-22T12:45:00Z' } }));
    const archives = answerArchive(api);
    const download = new DownloadPage(page);

    const started = page.waitForEvent('download');
    await download.open(ID);

    expect((await started).suggestedFilename()).toBe('christian-fitness-data.zip');
    await expect(download.heading).toHaveText('Your download is ready');
    await expect.poll(() => page.title()).toBe('Download your data · Christian Fitness');
    await expect(download.done).toHaveAttribute('role', 'status');
    await expect(download.done).toBeFocused();
    await expect(download.doneText).toHaveText(
      "Your data is on its way to your device. If it doesn't start, download it again. The link works for 7 days, until April 22, 2026, and only while you're signed in.",
    );
    await expect(download.backLink).toHaveAttribute('href', '/preferences');
    await expect(download.backToPreferences).toHaveAttribute('href', '/preferences');
    expect(archives()).toBe(1);

    const again = page.waitForEvent('download');
    await download.downloadAgain.click();
    expect((await again).suggestedFilename()).toBe('christian-fitness-data.zip');
    expect(archives()).toBe(2);
    await expect(download.heading).toHaveText('Your download is ready');
  });

  test('a link that is not found says the download has expired and starts nothing', async ({
    page,
    api,
  }) => {
    api.on('GET', LINK, () => ({ status: 404, json: { code: 'not_found' } }));
    const archives = answerArchive(api);
    const download = new DownloadPage(page);

    await download.open(ID);

    await expect(download.heading).toHaveText('This download has expired');
    await expect(download.done).toHaveAttribute('role', 'alert');
    await expect(download.doneText).toHaveText('This download has expired. Request a new one.');
    await expect(download.requestNew).toHaveAttribute('href', '/preferences');
    expect(archives()).toBe(0);
  });

  test('skeletons show while the link is checked; with no answer, Try again checks again', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    api.on('GET', LINK, async () => {
      await gate;
      return fail ? { abort: true } : { json: { expiresAt: '2026-04-22T12:45:00Z' } };
    });
    answerArchive(api);
    const download = new DownloadPage(page);

    await download.open(ID);

    await expect(download.heading).toHaveText('Your download');
    await expect(download.loading).toBeVisible();
    release();
    await expect(download.error).toContainText("Your download didn't start");
    await expect(download.error).toContainText(
      "We couldn't reach Christian Fitness. Check your connection and try again.",
    );
    await expect(download.backToPreferences).toHaveAttribute('href', '/preferences');
    fail = false;
    const started = page.waitForEvent('download');
    await download.tryAgain.click();
    await started;
    await expect(download.heading).toHaveText('Your download is ready');
  });
});
