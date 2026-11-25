import {
  CAST_LISTED,
  CAST_SUGGESTIONS,
  checks,
  listedPage,
  LISTINGS_NOW,
  NO_SUGGESTIONS,
  suggestionList,
  type SuggestionDetailFixture,
} from '../fixtures/admin-directory';
import type { ApiHandlers } from '../fixtures/api-handlers';
import { answerPhotos } from '../fixtures/directory';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { AdminShell } from '../page-objects/admin/admin-shell.page';
import { DeclineSuggestionDialog } from '../page-objects/admin/decline-suggestion.dialog';
import { DirectoryListingEditorDialog } from '../page-objects/admin/directory-listing-editor.dialog';
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

// L2-073 AC1 to AC3 and AC11 (journey 18; ADR 0090): staff review suggestions on Listings.
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
  // L2-073 AC9 (ADR 0090): the list pages 50 at a time; Load more reads the next page below.
  test('Load more reads the next suggestions after the last shown and adds them below', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const asked: (string | null)[] = [];
    api.on('GET', LIST, (request) => {
      const after = new URL(request.url()).searchParams.get('after');
      asked.push(after);
      return {
        json:
          after === null
            ? suggestionList(CAST_SUGGESTIONS.slice(0, 2), { next: CAST_SUGGESTIONS[1].id })
            : suggestionList(CAST_SUGGESTIONS.slice(2)),
      };
    });
    api.on('GET', ONE, (request) => {
      const id = ONE.exec(new URL(request.url()).pathname)?.[1];
      return { json: CAST_SUGGESTIONS.find((s) => s.id === id) ?? CAST_SUGGESTIONS[0] };
    });
    const listings = new ManageListingsPage(page);
    await listings.open();
    await expect(listings.cards).toHaveCount(2);

    await listings.loadMoreButton.click();

    await expect(listings.cards).toHaveCount(CAST_SUGGESTIONS.length);
    await expect(listings.loadMoreButton).toHaveCount(0);
    expect(asked).toEqual([null, CAST_SUGGESTIONS[1].id]);
  });

  test('more suggestions that do not load keep those shown and a toast says so', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    api.on('GET', LIST, (request) =>
      new URL(request.url()).searchParams.has('after')
        ? { abort: true }
        : { json: suggestionList(CAST_SUGGESTIONS.slice(0, 2), { next: CAST_SUGGESTIONS[1].id }) },
    );
    api.on('GET', ONE, () => ({ json: CAST_SUGGESTIONS[0] }));
    const listings = new ManageListingsPage(page);
    await listings.open();
    await expect(listings.cards).toHaveCount(2);

    await listings.loadMoreButton.click();

    await expect(listings.toastTitle).toHaveText("More suggestions didn't load");
    await expect(listings.cards).toHaveCount(2);
    await expect(listings.loadMoreButton).toBeEnabled();
  });

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

// L2-073 AC4 and AC5 (ADR 0090): each check is saved as it is ticked; Approve waits for all four.
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

// L2-073 AC6 and AC9 (ADR 0090): approving a suggestion whose four checks passed.
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

const DECLINE = /^\/api\/admin\/directory\/suggestions\/([^/]+)\/decline$/;
const REASON = 'We couldn’t confirm his certification with the issuing body.';

// L2-073 AC8 (ADR 0090): declining a suggestion, with an optional reason.
test.describe('Admin app, declining a suggestion', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mocks decline-suggestion/default and busy, admin-listings/declined.
  test('Decline asks for an optional reason, reads Declining…, then says the sender was told', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const marcus = CAST_SUGGESTIONS[1];
    answer(api, CAST_SUGGESTIONS);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const sent: { path: string; body: unknown }[] = [];
    api.on('POST', DECLINE, async (request) => {
      sent.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
      await held;
      return { json: { status: 'declined', listingId: null, claim: null } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open(`?selected=${marcus.id}`);

    await listings.declineButton.click();
    const dialog = new DeclineSuggestionDialog(page);

    await expect(dialog.title).toHaveText('Decline Coach Marcus Delaney');
    await expect(dialog.subtitle).toHaveText('Instructor · Mississauga');
    await expect(dialog.reasonLabel).toHaveText('Reason (optional)');
    await expect(dialog.reasonHint).toHaveText(
      'Staff keep this on file. The person who suggested it is not sent it. 500 characters left.',
    );
    await expect(dialog.reason).toBeFocused();
    await dialog.reason.fill(REASON);
    await expect(dialog.reasonHint).toContainText('440 characters left.');
    await expect(dialog.submitButton).toHaveText('Decline suggestion');
    await dialog.submitButton.click();

    await expect(dialog.submitButton).toHaveText('Declining…');
    await expect(dialog.submitButton).toBeDisabled();
    await expect(dialog.cancelButton).toBeDisabled();
    await expect(dialog.reason).toHaveAttribute('readonly', '');
    release();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(listings.result).toHaveText(
      'Declined. The person who suggested it has been told.',
    );
    await expect(listings.cardTag('Coach Marcus Delaney')).toHaveText('Declined');
    await expect(listings.tab('Suggestions')).toHaveText('Suggestions 2');
    await expect(listings.check('Credentials')).toBeDisabled();
    expect(sent).toEqual([
      {
        path: `/api/admin/directory/suggestions/${marcus.id}/decline`,
        body: { reason: REASON },
      },
    ]);
  });

  test('a decline with no reason sends none, and Cancel sends nothing', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, [CAST_SUGGESTIONS[1]]);
    const sent: unknown[] = [];
    api.on('POST', DECLINE, (request) => {
      sent.push(request.postDataJSON());
      return { json: { status: 'declined', listingId: null, claim: null } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open();
    const dialog = new DeclineSuggestionDialog(page);

    await listings.declineButton.click();
    await dialog.cancelButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(listings.declineButton).toBeFocused();
    expect(sent).toEqual([]);

    await listings.declineButton.click();
    await dialog.reason.fill('   ');
    await dialog.submitButton.click();

    await expect(listings.result).toHaveText(
      'Declined. The person who suggested it has been told.',
    );
    expect(sent).toEqual([{ reason: null }]);
  });

  // Mock decline-suggestion/invalid.
  test('a reason over 500 characters is named in a summary and beside the field, and nothing is sent', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    answer(api, [CAST_SUGGESTIONS[1]]);
    const sent: unknown[] = [];
    api.on('POST', DECLINE, (request) => {
      sent.push(request.postDataJSON());
      return { json: { status: 'declined', listingId: null, claim: null } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open();
    await listings.declineButton.click();
    const dialog = new DeclineSuggestionDialog(page);

    await dialog.reason.fill('a'.repeat(501));
    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('1 thing to fix');
    await expect(dialog.alertLinks).toHaveText(['Use 500 characters or fewer']);
    await expect(dialog.reasonError).toHaveText('Use 500 characters or fewer');
    await expect(dialog.reason).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toEqual([]);
  });

  // Mocks decline-suggestion/failed and refused.
  test('a decline that fails keeps the reason; one decided elsewhere first says so and Close shows it as it is', async ({
    page,
    api,
  }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const marcus = CAST_SUGGESTIONS[1];
    let list = [marcus];
    api.on('GET', LIST, () => ({ json: suggestionList(list, { listed: 12 }) }));
    api.on('GET', ONE, () => ({ json: list[0] }));
    let refusal: 'abort' | 'decided' = 'abort';
    api.on('POST', DECLINE, () =>
      refusal === 'abort'
        ? { abort: true }
        : { status: 409, json: { status: 409, code: 'suggestion_decided' } },
    );
    const listings = new ManageListingsPage(page);
    await listings.open();
    await listings.declineButton.click();
    const dialog = new DeclineSuggestionDialog(page);

    await dialog.reason.fill(REASON);
    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText("Couldn't decline the suggestion");
    await expect(dialog.alertText).toHaveText(
      "The server didn't respond. Nothing was lost; try again.",
    );
    await expect(dialog.reason).toHaveValue(REASON);
    await expect(dialog.submitButton).toHaveText('Decline suggestion');

    refusal = 'decided';
    list = [{ ...marcus, status: 'approved' }];
    await dialog.submitButton.click();

    await expect(dialog.alertTitle).toHaveText('This suggestion was already decided');
    await expect(dialog.alertText).toHaveText(
      'Someone else approved or declined it. Close this to see it as it is now.',
    );
    await dialog.cancelButton.click();
    await expect(dialog.dialog).toHaveCount(0);
    await expect(listings.cardTag('Coach Marcus Delaney')).toHaveText('Approved');
    await expect(listings.result).toHaveText('Approved.');
  });
});

const LISTED = '/api/admin/directory/listings';
const LISTING = /^\/api\/admin\/directory\/listings\/([^/]+)$/;
const PHOTOS = '/api/admin/directory/photos';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

// L2-073 AC10 and AC13 (ADR 0090): Listed, and staff's Edit.
test.describe('Admin app, Listed', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-listings/listed.
  test('shows each published listing with its mark, name, Verified mark, kind, area and followers', async ({
    page,
    api,
  }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    api.on('GET', LISTED, () => ({ json: listedPage(CAST_LISTED, { total: 12 }) }));
    const listings = new ManageListingsPage(page);

    await listings.open('?tab=listed');

    await expect(listings.currentTab).toHaveText('Listed 12');
    await expect(listings.listedRows).toHaveCount(4);
    expect(await listings.listedTexts()).toEqual([
      ['Christian Fitness', 'Organization', 'Toronto-wide', '2,140'],
      ['Danielle Okafor', 'Instructor', 'East York', '935'],
      ['Lakeshore Runners Fellowship', 'Organization', 'Etobicoke', '612'],
      ['Northline Athletic', 'Company', 'Roncesvalles', '256'],
    ]);
    await expect(listings.listedMark('Christian Fitness')).toHaveText('CF');
    await expect(listings.listedPhoto('Danielle Okafor')).toHaveAttribute(
      'src',
      '/api/directory/photos/0123456789abcdef0123456789abcdef.jpg',
    );
    await expect(listings.listedVerified('Christian Fitness')).toHaveAttribute(
      'aria-label',
      'Verified',
    );
    await expect(listings.listedVerified('Northline Athletic')).toHaveCount(0);
    await expect(listings.editButton('Lakeshore Runners Fellowship')).toBeVisible();
    await expect(listings.picker).toHaveCount(0);
  });

  // Mocks directory-listing-editor/default and busy, admin-listings/listing-saved.
  test('Edit opens the editor on the listing; Save changes saves it and a toast says so', async ({
    page,
    api,
  }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    const lakeshore = CAST_LISTED[2];
    let listed = CAST_LISTED;
    api.on('GET', LISTED, () => ({ json: listedPage(listed, { total: 12 }) }));
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const sent: { path: string; body: unknown }[] = [];
    api.on('PUT', LISTING, async (request) => {
      const body = request.postDataJSON() as Record<string, unknown>;
      sent.push({ path: new URL(request.url()).pathname, body });
      await held;
      const saved = { ...lakeshore, ...body, website: 'https://lakeshorerunners.ca' };
      listed = listed.map((l) => (l.id === lakeshore.id ? (saved as typeof lakeshore) : l));
      return { json: saved };
    });
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');

    await listings.editButton('Lakeshore Runners Fellowship').click();
    const editor = new DirectoryListingEditorDialog(page);

    await expect(editor.title).toHaveText('Edit listing');
    await expect(editor.subtitle).toHaveText(
      'Lakeshore Runners Fellowship · changes show in the directory at once',
    );
    await expect(editor.name).toBeFocused();
    await expect(editor.name).toHaveValue('Lakeshore Runners Fellowship');
    await expect(editor.kind.locator('option:checked')).toHaveText('Organization');
    await expect(editor.area).toHaveValue('Etobicoke');
    await expect(editor.tagline).toHaveValue(
      'Beginner-friendly running club with a prayer at every finish',
    );
    await expect(editor.about).toHaveValue(lakeshore.about);
    await expect(editor.website).toHaveValue('https://lakeshorerunners.ca');
    await expect(editor.photoName).toHaveText('No image chosen');
    await expect(editor.verifiedNote).toHaveText(
      'The Verified mark comes from the four checks and cannot be changed here.',
    );
    await editor.name.fill('Lakeshore Runners');
    await editor.kind.selectOption({ label: 'Church Ministry' });
    await editor.saveButton.click();

    await expect(editor.saveButton).toHaveText('Saving…');
    await expect(editor.cancelButton).toBeDisabled();
    await expect(editor.name).toHaveAttribute('readonly', '');
    release();
    await expect(editor.dialog).toHaveCount(0);
    await expect(listings.toastTitle).toHaveText('Lakeshore Runners updated');
    await expect(listings.toastText).toHaveText('The directory shows the changes now.');
    await expect(listings.listedRow('Lakeshore Runners')).toContainText('Church Ministry');
    expect(sent).toEqual([
      {
        path: `/api/admin/directory/listings/${lakeshore.id}`,
        body: {
          name: 'Lakeshore Runners',
          kind: 'church-ministry',
          area: 'Etobicoke',
          tagline: lakeshore.tagline,
          about: lakeshore.about,
          website: 'https://lakeshorerunners.ca',
          photoKey: null,
        },
      },
    ]);
  });

  test('a chosen photo is uploaded at once and saved with the listing', async ({ page, api }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    api.on('GET', LISTED, () => ({ json: listedPage(CAST_LISTED) }));
    const uploads: string[] = [];
    api.on('POST', PHOTOS, (request) => {
      uploads.push(request.headers()['content-type'] ?? '');
      return { status: 201, json: { photoKey: 'fedcba9876543210fedcba9876543210.png' } };
    });
    const saved: unknown[] = [];
    api.on('PUT', LISTING, (request) => {
      const body = request.postDataJSON() as { photoKey: string | null };
      saved.push(body.photoKey);
      return { json: { ...CAST_LISTED[3], ...body } };
    });
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');
    await listings.editButton('Northline Athletic').click();
    const editor = new DirectoryListingEditorDialog(page);

    await editor.choosePhoto('northline.png', PNG);

    await expect(editor.photoName).toHaveText('northline.png');
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toContain('multipart/form-data');
    await editor.saveButton.click();
    await expect(editor.dialog).toHaveCount(0);
    expect(saved).toEqual(['fedcba9876543210fedcba9876543210.png']);
  });

  // Mock directory-listing-editor/invalid.
  test('a refused save names each field in a summary and beside it, and keeps what was typed', async ({
    page,
    api,
  }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    api.on('GET', LISTED, () => ({ json: listedPage(CAST_LISTED) }));
    api.on('PUT', LISTING, () => ({
      status: 400,
      json: {
        status: 400,
        code: 'validation_failed',
        fieldCodes: { name: 'name_required', website: 'website_invalid' },
      },
    }));
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');
    await listings.editButton('Lakeshore Runners Fellowship').click();
    const editor = new DirectoryListingEditorDialog(page);

    await editor.name.fill('');
    await editor.website.fill('lakeshore runners');
    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText('2 things to fix before saving');
    await expect(editor.alertLinks).toHaveText([
      'Give the listing a name members will recognize',
      'Enter a web address like lakeshorerunners.ca',
    ]);
    await expect(editor.name).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.website).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.website).toHaveValue('lakeshore runners');
    await expect(editor.saveButton).toHaveText('Save changes');
  });

  // Mock directory-listing-editor/failed.
  test('a save that does not go through says so and keeps what was typed', async ({
    page,
    api,
  }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    api.on('GET', LISTED, () => ({ json: listedPage(CAST_LISTED) }));
    api.on('PUT', LISTING, () => ({ abort: true }));
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');
    await listings.editButton('Lakeshore Runners Fellowship').click();
    const editor = new DirectoryListingEditorDialog(page);

    await editor.area.fill('Mimico');
    await editor.saveButton.click();

    await expect(editor.alertTitle).toHaveText("Couldn't save the changes");
    await expect(editor.alertText).toHaveText(
      "The server didn't respond. The listing is unchanged and what you typed is still here; try again.",
    );
    await expect(editor.area).toHaveValue('Mimico');
    await editor.cancelButton.click();
    await expect(editor.dialog).toHaveCount(0);
    await expect(listings.editButton('Lakeshore Runners Fellowship')).toBeFocused();
  });

  // ADR 0090: Listed pages 50 at a time.
  test('Load more reads the next page of Listed after the last shown', async ({ page, api }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    const asked: (string | null)[] = [];
    api.on('GET', LISTED, (request) => {
      const after = new URL(request.url()).searchParams.get('after');
      asked.push(after);
      return {
        json:
          after === null
            ? listedPage(CAST_LISTED.slice(0, 2), { total: 4, next: CAST_LISTED[1].id })
            : listedPage(CAST_LISTED.slice(2), { total: 4 }),
      };
    });
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');
    await expect(listings.listedRows).toHaveCount(2);

    await listings.loadMoreButton.click();

    await expect(listings.listedRows).toHaveCount(4);
    await expect(listings.loadMoreButton).toHaveCount(0);
    expect(asked).toEqual([null, CAST_LISTED[1].id]);
  });

  test('Listed that does not load offers Try again', async ({ page, api }) => {
    answer(api, CAST_SUGGESTIONS);
    answerPhotos(api);
    let fail = true;
    api.on('GET', LISTED, () => (fail ? { abort: true } : { json: listedPage(CAST_LISTED) }));
    const listings = new ManageListingsPage(page);
    await listings.open('?tab=listed');

    await expect(listings.errorTitle).toHaveText("Listings didn't load");
    fail = false;
    await listings.tryAgainButton.click();

    await expect(listings.listedRows).toHaveCount(4);
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

// L2-073 AC1 (ADR 0090), mock admin-dashboard/default: Listings in the navigation counts the
// suggestions waiting, read on entry and again after a decision; a failed read shows no count.
test.describe('Admin app, the suggestions count in the navigation', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Listings counts the suggestions waiting, named for assistive technology', async ({
    page,
    api,
  }) => {
    api.on('GET', '/api/admin/counts', () => ({ json: { suggestions: 3 } }));
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.navCount('Listings')).toHaveText('3');
    await expect(shell.navCount('Listings')).toHaveAttribute(
      'aria-label',
      '3 suggestions to check',
    );
  });

  test('one suggestion is counted as one', async ({ page, api }) => {
    api.on('GET', '/api/admin/counts', () => ({ json: { suggestions: 1 } }));
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.navCount('Listings')).toHaveAttribute('aria-label', '1 suggestion to check');
  });

  test('after a suggestion is approved, the count is read again', async ({ page, api }) => {
    await page.clock.setFixedTime(LISTINGS_NOW);
    const ready = { ...CAST_SUGGESTIONS[1], checks: ALL_PASSED };
    answer(api, [CAST_SUGGESTIONS[0], ready, CAST_SUGGESTIONS[2]]);
    let waiting = 3;
    api.on('GET', '/api/admin/counts', () => ({ json: { suggestions: waiting } }));
    api.on('POST', APPROVE, () => {
      waiting = 2;
      return { json: { status: 'approved', listingId: 'l-1', claim: 'message' } };
    });
    const listings = new ManageListingsPage(page);
    const shell = new AdminShell(page);
    await listings.open(`?selected=${ready.id}`);
    await expect(shell.navCount('Listings')).toHaveText('3');

    await listings.approveButton.click();

    await expect(shell.navCount('Listings')).toHaveText('2');
  });

  test('when the count does not load, no count shows and nothing else changes', async ({
    page,
    api,
  }) => {
    let asked = 0;
    api.on('GET', '/api/admin/counts', () => {
      asked += 1;
      return { abort: true };
    });
    const shell = new AdminShell(page);

    await shell.open();

    await expect(shell.heading).toBeVisible();
    await expect.poll(() => asked).toBe(1);
    await expect(shell.navCount('Listings')).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });
});
