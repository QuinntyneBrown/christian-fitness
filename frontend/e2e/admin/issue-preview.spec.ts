import { ISSUE_48 } from '../fixtures/newsletter-issue';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { IssuePreviewPage } from '../page-objects/admin/issue-preview.page';

// L2-070 AC9 (journey 28): Preview opens the issue as saved, as the web version draws it, in a tab
// of its own outside the console's navigation, under a banner that says it is a preview.
test.describe('Admin app, the issue preview', () => {
  test('shows the issue as the web version draws it, under a banner, greeting nobody', async ({
    page,
    api,
  }) => {
    const asked: string[] = [];
    api.on('GET', /^\/api\/admin\/newsletter\/issues\/\d+\/preview$/, (request) => {
      asked.push(new URL(request.url()).pathname);
      return { json: { ...ISSUE_48, number: 49 } };
    });
    const preview = new IssuePreviewPage(page);

    await preview.open(49);

    await expect(preview.name).toHaveText('The Abundant Weekly');
    await expect(preview.banner).toContainText('This is a preview.');
    await expect(preview.banner).toContainText(
      'Issue 49 as it is saved now. Links work once it is sent.',
    );
    await expect(preview.closeLink).toHaveAttribute('href', '/newsletter');
    await expect(preview.date).toHaveText('No. 49 · Saturday, April 11, 2026');
    await expect(preview.greeting).toHaveCount(0);
    await expect(preview.leadTitle).toHaveText(ISSUE_48.lead.headline);
    await expect(preview.briefs).toHaveCount(2);
    expect(asked).toEqual(['/api/admin/newsletter/issues/49/preview']);
    // A story's address is the member app's: following it here goes nowhere.
    await preview.readTheStory.click();
    expect(preview.path()).toBe('/newsletter/preview?issue=49');
  });

  test('a Moderator previews too; a preview that does not load offers Try again and the way back', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    let fail = true;
    api.on('GET', '/api/admin/newsletter/issues/49/preview', () =>
      fail ? { abort: true } : { json: { ...ISSUE_48, number: 49 } },
    );
    const preview = new IssuePreviewPage(page);

    await preview.open(49);

    await expect(preview.errorTitle).toHaveText("The preview didn't load");
    await expect(preview.backToDesk).toHaveAttribute('href', '/newsletter');
    fail = false;
    await preview.tryAgainButton.click();
    await expect(preview.name).toHaveText('The Abundant Weekly');
  });

  test('an address that names no issue opens the not-found screen', async ({ page }) => {
    const preview = new IssuePreviewPage(page);

    await preview.open('abc');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
