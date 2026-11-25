import {
  CAST_SUGGESTIONS,
  checks,
  LISTINGS_NOW,
  NO_SUGGESTIONS,
  suggestionList,
  type SuggestionDetailFixture,
} from '../fixtures/admin-directory';
import type { ApiHandlers } from '../fixtures/api-handlers';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { ManageListingsPage } from '../page-objects/admin/manage-listings.page';

const LIST = '/api/admin/directory/suggestions';
const ONE = /^\/api\/admin\/directory\/suggestions\/([^/]+)$/;

/** Answers the list and each suggestion of `cast`. */
function answer(api: ApiHandlers, cast: SuggestionDetailFixture[], listed = 12): void {
  api.on('GET', LIST, () => ({ json: suggestionList(cast, { listed }) }));
  api.on('GET', ONE, (request) => {
    const id = ONE.exec(new URL(request.url()).pathname)?.[1];
    const found = cast.find((s) => s.id === id);
    return found
      ? { json: found }
      : { status: 404, json: { status: 404, code: 'suggestion_not_found' } };
  });
}

// L2-073 AC1 to AC3 and AC11 (journey 18; ADR 0087): staff review suggestions on Listings.
test.describe('Admin app, listing suggestions', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-listings/default and unchecked.
  test('lists the suggestions oldest first with who sent them and when, and shows the first', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, CAST_SUGGESTIONS);
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.heading).toHaveText('Listings');
    await expect.poll(() => listings.title()).toBe('Listings · Christian Fitness Admin');
    await expect(listings.subtitle).toHaveText(
      'Nothing goes in the directory until it passes all four checks.',
    );
    await expect(listings.tabLinks).toHaveText(['Suggestions 3', 'Listed 12']);
    await expect(listings.currentTab).toHaveText('Suggestions 3');
    expect(await listings.cardTexts()).toEqual([
      [
        'Eastside Ladies Who Lift',
        'Organization · Danforth & Pape',
        'From Adaeze Kalu · 4 hours ago',
      ],
      ['Coach Marcus Delaney', 'Instructor · Mississauga', 'Self-submitted · Yesterday'],
      ['Rooted Physio', 'Company · Leslieville', 'From Jordan Reid · 3 days ago'],
    ]);
    await expect(listings.currentCard).toHaveCount(1);
    await expect(listings.currentCard).toContainText('Eastside Ladies Who Lift');
    await expect(listings.kind).toHaveText('Organization');
    await expect(listings.name).toHaveText('Eastside Ladies Who Lift');
    await expect(listings.where).toHaveText(
      'Danforth & Pape · instagram.com/eastsideladieslift (opens in a new tab)',
    );
    await expect(listings.website).toHaveAttribute(
      'href',
      'https://instagram.com/eastsideladieslift',
    );
    await expect(listings.website).toHaveAttribute('target', '_blank');
    await expect(listings.note).toHaveText(CAST_SUGGESTIONS[0].reason ?? '');
    await expect(listings.by).toHaveText('Adaeze Kalu · attended');
    await expect(listings.checksLegend).toHaveText('Checks');
    await expect(listings.checksPassed).toHaveText('1 of 4 passed');
    expect(await listings.checkTexts()).toEqual([
      ['Credentials', 'Certification or registration number verified with the issuing body'],
      ['Insurance', 'Liability coverage on file, where the work calls for it'],
      ['Two references', 'At least one from a church or ministry leader'],
      ['Conversation', 'A call with our team about faith and how they work'],
    ]);
    await expect(listings.check('Credentials')).toBeChecked();
    await expect(listings.check('Insurance')).not.toBeChecked();
    await expect(listings.approveButton).toBeDisabled();
    await expect(listings.approveButton).toHaveAccessibleDescription(
      'Approve unlocks when all four checks pass.',
    );
    await expect(listings.declineButton).toBeEnabled();
  });

  test('choosing another suggestion shows it, marks it current and keeps it in the address', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, CAST_SUGGESTIONS);
    const listings = new ManageListingsPage(page);
    await listings.open();
    await expect(listings.name).toHaveText('Eastside Ladies Who Lift');

    await listings.card('Coach Marcus Delaney').click();

    await expect(listings.name).toHaveText('Coach Marcus Delaney');
    await expect(listings.currentCard).toContainText('Coach Marcus Delaney');
    expect(listings.location()).toBe(`/listings?selected=${CAST_SUGGESTIONS[1].id}`);
    await expect(listings.by).toHaveText('Submitted by the listing themselves');
    await expect(listings.checksPassed).toHaveText('3 of 4 passed');

    await listings.card('Rooted Physio').click();

    await expect(listings.name).toHaveText('Rooted Physio');
    await expect(listings.where).toHaveText('Leslieville');
    await expect(listings.note).toHaveCount(0);
    await expect(listings.by).toHaveText('Jordan Reid · knows them');
    await expect(listings.checksPassed).toHaveText('0 of 4 passed');
  });

  test('an address naming a suggestion opens it', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, CAST_SUGGESTIONS);
    const listings = new ManageListingsPage(page);

    await listings.open(`?selected=${CAST_SUGGESTIONS[2].id}`);

    await expect(listings.name).toHaveText('Rooted Physio');
    await expect(listings.currentCard).toContainText('Rooted Physio');
  });

  test('names, areas and words are shown as text, never as HTML', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const odd = {
      ...CAST_SUGGESTIONS[0],
      name: '<b>Eastside</b>',
      area: '<i>Danforth</i>',
      reason: '<script>x</script>',
      from: '<u>Adaeze</u>',
    };
    answer(api, [odd]);
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.name).toHaveText('<b>Eastside</b>');
    await expect(listings.note).toHaveText('<script>x</script>');
    expect(await listings.cardTexts()).toEqual([
      ['<b>Eastside</b>', 'Organization · <i>Danforth</i>', 'From <u>Adaeze</u> · 4 hours ago'],
    ]);
  });

  // Mock admin-listings/loading.
  test('shows skeletons while the suggestions load', async ({ page, api }) => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    api.on('GET', LIST, async () => {
      await held;
      return { json: NO_SUGGESTIONS };
    });
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.loading).toBeVisible();
    await expect(listings.skeletons.first()).toBeVisible();
    release();
    await expect(listings.loading).toHaveCount(0);
  });

  // Mock admin-listings/empty.
  test('says when no suggestion waits and points to Listed', async ({ page, api }) => {
    api.on('GET', LIST, () => ({ json: { ...NO_SUGGESTIONS, listed: 12 } }));
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.emptyTitle).toHaveText('No suggestions waiting');
    await expect(listings.emptyText).toHaveText(
      'When a member suggests someone for the directory, it shows here with the four checks to run.',
    );
    await expect(listings.seeListed).toHaveAttribute('href', '/listings?tab=listed');
    await expect(listings.tabLinks).toHaveText(['Suggestions 0', 'Listed 12']);
  });

  // Mock admin-listings/error.
  test('says when the suggestions did not load, and Try again loads them', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    let fail = true;
    api.on('GET', LIST, () =>
      fail ? { abort: true } : { json: suggestionList(CAST_SUGGESTIONS) },
    );
    api.on('GET', ONE, () => ({ json: CAST_SUGGESTIONS[0] }));
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.errorTitle).toHaveText("Suggestions didn't load");
    fail = false;
    await listings.tryAgainButton.click();
    await expect(listings.cards).toHaveCount(3);
  });
});

const CHECK = /^\/api\/admin\/directory\/suggestions\/([^/]+)\/checks\/([^/]+)$/;

// L2-073 AC4 and AC5 (ADR 0087): each check is saved as it is ticked; Approve waits for all four.
test.describe('Admin app, the four checks', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-listings/ready.
  test('ticking the last check saves it at once and makes Approve listing available', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, CAST_SUGGESTIONS);
    const sent: { path: string; body: unknown }[] = [];
    api.on('PUT', CHECK, (request) => {
      sent.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
      return {
        json: { checks: checks('credentials', 'insurance', 'two-references', 'conversation') },
      };
    });
    const listings = new ManageListingsPage(page);
    await listings.open(`?selected=${CAST_SUGGESTIONS[1].id}`);
    await expect(listings.checksPassed).toHaveText('3 of 4 passed');

    await listings.check('Conversation').check();

    await expect(listings.checksPassed).toHaveText('4 of 4 passed');
    await expect(listings.approveButton).toBeEnabled();
    await expect(listings.hint).toHaveCount(0);
    expect(sent).toEqual([
      {
        path: `/api/admin/directory/suggestions/${CAST_SUGGESTIONS[1].id}/checks/conversation`,
        body: { passed: true },
      },
    ]);
  });

  test('unticking a check saves it and Approve listing waits again', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const ready = {
      ...CAST_SUGGESTIONS[1],
      checks: checks('credentials', 'insurance', 'two-references', 'conversation'),
    };
    answer(api, [ready]);
    const bodies: unknown[] = [];
    api.on('PUT', CHECK, (request) => {
      bodies.push(request.postDataJSON());
      return { json: { checks: checks('credentials', 'two-references', 'conversation') } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open();
    await expect(listings.approveButton).toBeEnabled();

    await listings.check('Insurance').uncheck();

    await expect(listings.checksPassed).toHaveText('3 of 4 passed');
    await expect(listings.approveButton).toBeDisabled();
    await expect(listings.hint).toHaveText('Approve unlocks when all four checks pass.');
    expect(bodies).toEqual([{ passed: false }]);
  });

  // Mock admin-listings/tick-failed.
  test('a tick that does not save goes back as it was and a toast says so', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, CAST_SUGGESTIONS);
    api.on('PUT', CHECK, () => ({ abort: true }));
    const listings = new ManageListingsPage(page);
    await listings.open(`?selected=${CAST_SUGGESTIONS[1].id}`);

    await listings.check('Conversation').check();

    await expect(listings.toastTitle).toHaveText("We couldn't save that check");
    await expect(listings.toastText).toHaveText(
      'The box is back as it was. Try again in a moment.',
    );
    await expect(listings.alertToast).toHaveCount(1);
    await expect(listings.check('Conversation')).not.toBeChecked();
    await expect(listings.checksPassed).toHaveText('3 of 4 passed');
    await expect(listings.approveButton).toBeDisabled();
  });
});

const APPROVE = /^\/api\/admin\/directory\/suggestions\/([^/]+)\/approve$/;
const ALL_PASSED = checks('credentials', 'insurance', 'two-references', 'conversation');

// L2-073 AC6 and AC9 (ADR 0087): approving a suggestion whose four checks passed.
test.describe('Admin app, approving a suggestion', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mocks admin-listings/approving and approved.
  test('Approve listing reads Approving…, then says the claim link was sent and the count falls', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const ready = { ...CAST_SUGGESTIONS[1], checks: ALL_PASSED };
    answer(api, [CAST_SUGGESTIONS[0], ready, CAST_SUGGESTIONS[2]]);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const approved: string[] = [];
    api.on('POST', APPROVE, async (request) => {
      approved.push(new URL(request.url()).pathname);
      await held;
      return { json: { status: 'approved', listingId: 'l-1', claim: 'message' } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open(`?selected=${ready.id}`);

    await listings.approveButton.click();

    await expect(listings.approveButton).toHaveText('Approving…');
    await expect(listings.approveButton).toBeDisabled();
    await expect(listings.declineButton).toBeDisabled();
    await expect(listings.check('Credentials')).toBeDisabled();
    release();
    await expect(listings.result).toHaveText(
      'Approved. We’ve sent them a link to claim and publish their listing.',
    );
    await expect(listings.result).toHaveAttribute('role', 'status');
    await expect(listings.approveButton).toHaveCount(0);
    await expect(listings.check('Conversation')).toBeDisabled();
    await expect(listings.cardTag('Coach Marcus Delaney')).toHaveText('Approved');
    await expect(listings.tab('Suggestions')).toHaveText('Suggestions 2');
    expect(approved).toEqual([`/api/admin/directory/suggestions/${ready.id}/approve`]);
  });

  test('a staff-managed approval says the listing is in the directory', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, [{ ...CAST_SUGGESTIONS[2], checks: ALL_PASSED }]);
    api.on('POST', APPROVE, () => ({
      json: { status: 'approved', listingId: 'l-2', claim: 'staff-managed' },
    }));
    const listings = new ManageListingsPage(page);
    await listings.open();

    await listings.approveButton.click();

    await expect(listings.result).toHaveText(
      'Approved. It’s in the directory now, managed by our team.',
    );
  });

  test('an approval that does not go through says so and Approve listing stays', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, [{ ...CAST_SUGGESTIONS[1], checks: ALL_PASSED }]);
    api.on('POST', APPROVE, () => ({ abort: true }));
    const listings = new ManageListingsPage(page);
    await listings.open();

    await listings.approveButton.click();

    await expect(listings.toastTitle).toHaveText("We couldn't approve the suggestion");
    await expect(listings.toastText).toHaveText('Nothing changed. Try again in a moment.');
    await expect(listings.alertToast).toHaveCount(1);
    await expect(listings.approveButton).toHaveText('Approve listing');
    await expect(listings.approveButton).toBeEnabled();
    await expect(listings.result).toHaveCount(0);
  });

  // L2-073 AC9: a suggestion decided before shows how, and its checks are read-only.
  test('a decided suggestion is tagged and its checks are read-only', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const declined = { ...CAST_SUGGESTIONS[0], status: 'declined' as const };
    answer(api, [declined, CAST_SUGGESTIONS[1]]);
    const listings = new ManageListingsPage(page);

    await listings.open();

    await expect(listings.cardTag('Eastside Ladies Who Lift')).toHaveText('Declined');
    await expect(listings.tab('Suggestions')).toHaveText('Suggestions 1');
    await expect(listings.result).toHaveText(
      'Declined. The person who suggested it has been told.',
    );
    await expect(listings.check('Credentials')).toBeDisabled();
    await expect(listings.approveButton).toHaveCount(0);
    await expect(listings.declineButton).toHaveCount(0);
  });
});

// L2-073 AC11, L2-019 AC1 (ADR 0064): a Moderator opens Listings as an Admin does.
test.describe('Admin app, listing suggestions for a Moderator', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-listings/moderator.
  test('Listings is in their navigation and opens with the suggestions', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    answer(api, CAST_SUGGESTIONS);
    const shell = new AdminShell(page);
    const listings = new ManageListingsPage(page);
    await shell.open('/');

    await shell.navItem('Listings').click();

    await expect(shell.currentItem).toHaveText('Listings');
    await expect(listings.cards).toHaveCount(3);
    await expect(listings.name).toHaveText('Eastside Ladies Who Lift');
  });
});
