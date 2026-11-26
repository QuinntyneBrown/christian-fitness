import { answerAsVisitor } from '../fixtures/claims';
import { ISSUE_48, ISSUE_NOT_FOUND } from '../fixtures/newsletter-issue';
import { expect, SIGNED_IN, test } from '../fixtures/test';
import { NewsletterPage } from '../page-objects/web/newsletter.page';

// L2-059 (journey 29; mocks newsletter/default, unpublished, loading, error): anyone reads the
// latest sent issue at /newsletter, or one by its number, as the email reads, under a bar that
// leads back to the news; only a signed-in member is greeted by name.
test.describe('Member app, the newsletter on the web', () => {
  test(
    'A visitor reads the latest issue: one article, the note, the big story, the calendar, the briefs and the verse',
    { tag: '@critical' },
    async ({ page, api }) => {
      answerAsVisitor(api, SIGNED_IN);
      api.on('GET', '/api/public/newsletter/issues/latest', () => ({ json: ISSUE_48 }));
      const newsletter = new NewsletterPage(page);

      await newsletter.open();

      await expect(newsletter.name).toHaveText('The Abundant Weekly');
      await expect.poll(() => newsletter.title()).toBe('The Abundant Weekly · Christian Fitness');
      await expect(newsletter.barText).toHaveText('Issue 48 · web version');
      await expect(newsletter.backLink).toHaveAttribute('href', '/');
      await expect(newsletter.date).toHaveText('No. 48 · Saturday, April 11, 2026');
      // A visitor is not greeted (AC2).
      await expect(newsletter.greeting).toHaveCount(0);
      await expect(newsletter.note).toHaveText(ISSUE_48.editorsNote);
      await expect(newsletter.article).toHaveCount(1);
      expect(await newsletter.headingOutline()).toEqual([
        ['H1', 'The Abundant Weekly'],
        ['H2', ISSUE_48.lead.headline],
        ['H2', 'On the calendar'],
        ['H2', 'Worth your time'],
        ['H3', ISSUE_48.briefs[0].headline],
        ['H3', ISSUE_48.briefs[1].headline],
      ]);
      await expect(newsletter.leadSection).toHaveText('The big story · Community');
      await expect(newsletter.readTheStory).toHaveAttribute('href', '/stories/basement-gym');
      expect(await newsletter.calendar()).toEqual([
        ['Apr', '18', 'Easter Sunrise 5K', 'Sat 6:45 AM · Waterfront · Free'],
        ['Apr', '25', 'Saturday Park Bootcamp', 'Sat 8:00 AM · Waterfront · $10'],
      ]);
      await expect(newsletter.seeEveryEvent).toHaveAttribute('href', '/');
      expect(await newsletter.briefValues()).toEqual([
        ['Nutrition', ISSUE_48.briefs[0].headline, '/stories/meal-prep-ministry', 'Priya Raman'],
        [
          'Faith & Body',
          ISSUE_48.briefs[1].headline,
          '/stories/sabbath-rest',
          'Pastor Ruth Adeyemi',
        ],
      ]);
      await expect(newsletter.quote).toHaveText(`“${ISSUE_48.verse}”`);
      await expect(newsletter.cite).toHaveText('1 Corinthians 6:19');
      // Every footer link leads to Subscribe: the web version unsubscribes nobody (AC3).
      expect(
        await newsletter.footerLinks.evaluateAll((links) =>
          links.map((a) => [a.textContent?.trim(), a.getAttribute('href')]),
        ),
      ).toEqual([
        ['Manage preferences', '/subscribe'],
        ['Follow by RSS', '/subscribe#rss'],
        ['Unsubscribe', '/subscribe'],
      ]);
      // A reading width of no more than 42rem (AC6).
      const { widthRem, overflowX } = await newsletter.measure();
      expect(widthRem).toBeLessThanOrEqual(42);
      expect(overflowX).toBe(0);
    },
  );

  test('A signed-in member is greeted by first name, and /newsletter/<number> shows that issue', async ({
    page,
    api,
  }) => {
    const asked: string[] = [];
    api.on('GET', /^\/api\/public\/newsletter\/issues\/.+$/, (request) => {
      asked.push(new URL(request.url()).pathname);
      return { json: { ...ISSUE_48, number: 47, lead: null } };
    });
    const newsletter = new NewsletterPage(page);

    await newsletter.open(47);

    await expect(newsletter.greeting).toHaveText('Morning, Grace.');
    await expect(newsletter.barText).toHaveText('Issue 47 · web version');
    // The big story was unpublished since (AC7): its section is left out, nothing else moves.
    await expect(newsletter.leadTitle).toHaveCount(0);
    await expect(newsletter.briefs).toHaveCount(2);
    expect(asked).toEqual(['/api/public/newsletter/issues/47']);
  });

  test('Nothing sent yet, an unknown number or an address that is no number shows the not-found view', async ({
    page,
    api,
  }) => {
    api.on('GET', /^\/api\/public\/newsletter\/issues\/.+$/, () => ISSUE_NOT_FOUND);
    const newsletter = new NewsletterPage(page);

    await newsletter.open();
    await expect(newsletter.notFoundHeading).toBeVisible();
    await newsletter.open(9999);
    await expect(newsletter.notFoundHeading).toBeVisible();
    await newsletter.open('abc');
    await expect(newsletter.notFoundHeading).toBeVisible();
    await expect(newsletter.article).toHaveCount(0);
  });

  test('A skeleton shows under the bar while it loads; when it does not, Try again and Back to news', async ({
    page,
    api,
  }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let fail = true;
    api.on('GET', '/api/public/newsletter/issues/latest', async () => {
      await gate;
      return fail ? { abort: true } : { json: ISSUE_48 };
    });
    const newsletter = new NewsletterPage(page);

    await newsletter.open();

    await expect(newsletter.barText).toHaveText('Web version');
    await expect(newsletter.loading).toContainText('Loading the newsletter');
    await expect(newsletter.skeletons.first()).toBeVisible();
    release();
    await expect(newsletter.errorTitle).toHaveText("This issue didn't load");
    await expect(newsletter.backToNews).toHaveAttribute('href', '/');
    fail = false;
    await newsletter.tryAgainButton.click();
    await expect(newsletter.name).toHaveText('The Abundant Weekly');
  });

  test('Read the story opens the story without leaving the app, and the page fits a phone', async ({
    page,
    api,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    api.on('GET', '/api/public/newsletter/issues/latest', () => ({ json: ISSUE_48 }));
    api.on('GET', /^\/api\/public\/stories\/.+$/, () => ISSUE_NOT_FOUND);
    api.on('GET', /^\/api\/stories\/.+$/, () => ISSUE_NOT_FOUND);
    const newsletter = new NewsletterPage(page);
    await newsletter.open();
    await expect(newsletter.name).toBeVisible();
    expect((await newsletter.measure()).overflowX).toBe(0);
    await page.evaluate(() => ((window as unknown as { kept: boolean }).kept = true));

    await newsletter.readTheStory.click();

    await expect.poll(() => newsletter.path()).toBe('/stories/basement-gym');
    expect(await page.evaluate(() => (window as unknown as { kept?: boolean }).kept)).toBe(true);
  });
});
