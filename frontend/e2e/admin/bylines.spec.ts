import { BYLINES, bylineList, type BylineFixture } from '../fixtures/admin-bylines';
import { expect, MODERATOR_SIGNED_IN, test, type ApiHandlers } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { AdminBylinesPage } from '../page-objects/admin/bylines.page';
import { AdminForbiddenPage } from '../page-objects/admin/forbidden.page';

/** Answers the list with `bylines` and counts how often it was asked for. */
function answerBylines(api: ApiHandlers, bylines: BylineFixture[] = BYLINES): { asked: number } {
  const seen = { asked: 0 };
  api.on('GET', '/api/admin/stories/bylines', () => {
    seen.asked += 1;
    return bylineList(bylines);
  });
  return seen;
}

// L2-077 AC1 (ADR 0094): Bylines lists every byline by name with its short bio, how many stories
// use it and Edit and Remove, under Stories in the Publish group.
test.describe('Admin app, the Bylines page', () => {
  test('lists every byline with its bio and how many stories use it, as the default mock draws it', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.heading).toHaveText('Bylines');
    await expect.poll(() => page.title()).toBe('Bylines · Christian Fitness Admin');
    await expect(bylines.subtitle).toHaveText(
      'The names a story can run under. Admins choose one in the story editor.',
    );
    await expect(bylines.addButton).toBeVisible();
    expect(await bylines.headings()).toEqual(['Byline', 'Short bio', 'Used by', 'Actions']);
    await expect(bylines.rows).toHaveCount(5);
    expect(await bylines.rowTexts()).toEqual([
      ['CF Team', 'Notices and event news from the Christian Fitness team.', '2 stories'],
      [
        'Marcus Bell',
        'Personal trainer who writes beginner guides and profiles of our professionals.',
        '2 stories',
      ],
      [
        'Naomi Clarke',
        'Writes about community, church sport and the people behind both.',
        '2 stories',
      ],
      ['Pastor Ruth Adeyemi', 'Pastor and writer on faith, rest and the body.', '1 story'],
      ['Priya Raman', 'Nutrition writer and meal-prep volunteer in Mississauga.', '1 story'],
    ]);
    await expect(bylines.avatars).toHaveText(['CT', 'MB', 'NC', 'PA', 'PR']);
    await expect(bylines.editButton('Marcus Bell')).toBeVisible();
    await expect(bylines.removeButton('Marcus Bell')).toBeVisible();
  });

  test('a byline no story uses reads "Not used yet"', async ({ page, api }) => {
    answerBylines(api, [{ ...BYLINES[0], stories: 0 }]);
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.rows).toHaveCount(1);
    expect(await bylines.rowTexts()).toEqual([
      ['CF Team', 'Notices and event news from the Christian Fitness team.', 'Not used yet'],
    ]);
  });

  // L2-077 AC11: names and bios are rendered as text, never as HTML.
  test('names and bios are rendered as text, never as HTML', async ({ page, api }) => {
    answerBylines(api, [
      { ...BYLINES[0], name: '<b>Bold</b> Writer', bio: '<img src=x onerror=alert(1)>' },
    ]);
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.rows).toHaveCount(1);
    expect(await bylines.rowTexts()).toEqual([
      ['<b>Bold</b> Writer', '<img src=x onerror=alert(1)>', '2 stories'],
    ]);
    await expect(bylines.table.locator('b, img')).toHaveCount(0);
  });

  test('the Admin navigation lists Stories under Publish, current on Bylines', async ({
    page,
    api,
  }) => {
    answerBylines(api);
    const shell = new AdminShell(page);
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.rows).toHaveCount(5);
    await expect(shell.navGroupLinks('Publish')).toHaveText(['Stories']);
    await expect(shell.currentItem).toHaveText('Stories');
    await expect(shell.navItem('Stories')).toHaveAttribute('href', '/stories');
  });

  // Mock admin-bylines/loading: a gate holds the answer, so no clock is needed.
  test('while the bylines load, skeleton rows are busy', async ({ page, api }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', '/api/admin/stories/bylines', async () => {
      await gate;
      return bylineList();
    });
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.loading).toBeVisible();
    await expect(bylines.skeletons).not.toHaveCount(0);
    await expect(bylines.addButton).toBeVisible();
    release();
    await expect(bylines.rows).toHaveCount(5);
    await expect(bylines.loading).toHaveCount(0);
  });

  // Mock admin-bylines/empty (L2-077 AC9).
  test('with no bylines, the empty state says a story needs one and offers Add byline', async ({
    page,
    api,
  }) => {
    answerBylines(api, []);
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.emptyTitle).toHaveText('No bylines yet');
    await expect(bylines.emptyText).toHaveText(
      'A story needs a byline before it can be published. Add the first one.',
    );
    await expect(bylines.emptyAddButton).toBeVisible();
    await expect(bylines.addButton).toHaveCount(0);
    await expect(bylines.table).toHaveCount(0);
  });

  // Mock admin-bylines/error (L2-077 AC9).
  test('bylines that do not load show "Bylines didn\'t load", and Try again loads them', async ({
    page,
    api,
  }) => {
    let fail = true;
    api.on('GET', '/api/admin/stories/bylines', () => (fail ? { abort: true } : bylineList()));
    const bylines = new AdminBylinesPage(page);

    await bylines.open();

    await expect(bylines.error).toHaveAttribute('role', 'alert');
    await expect(bylines.errorTitle).toHaveText("Bylines didn't load");
    await expect(bylines.errorText).toHaveText(
      "We couldn't reach Christian Fitness. Check your connection and try again.",
    );
    await expect(bylines.table).toHaveCount(0);
    fail = false;

    await bylines.tryAgainButton.click();

    await expect(bylines.rows).toHaveCount(5);
    await expect(bylines.error).toHaveCount(0);
  });
});

// L2-077 AC10 (L2-068 AC7; ADR 0094): a Moderator meets "Admins only" (`canManage` keeps Stories
// out of their navigation).
test.describe('Admin app, Bylines for a Moderator', () => {
  test('a Moderator opening Bylines sees "Admins only" at the address asked for', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    const shell = new AdminShell(page);
    const forbidden = new AdminForbiddenPage(page);

    await shell.open('/stories/bylines');

    await expect(forbidden.heading).toHaveText('Admins only');
    expect(forbidden.location()).toBe('/stories/bylines');
  });
});
