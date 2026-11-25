import { expect, test } from '../fixtures/test';
import { WebSuggestListingPage } from '../page-objects/web/suggest-listing.page';
import { answerDirectory, CAST } from '../fixtures/directory';
import { WebDirectoryPage } from '../page-objects/web/directory.page';

const SUGGESTIONS = '/api/directory/suggestions';

const STEPS = [
  { n: '1', title: 'We read it within 3 days', text: 'A real person on our team, not a filter.' },
  {
    n: '2',
    title: 'We run four checks',
    text: 'Credentials, insurance where it applies, two references, and a conversation about faith and practice.',
  },
  {
    n: '3',
    title: 'They approve their listing',
    text: 'Nothing goes live without the listed person or group saying yes.',
  },
  {
    n: '4',
    title: 'You hear back',
    text: 'We message you when it’s approved, or tell you why not.',
  },
];

// L2-062 AC2 to AC4 (ADR 0085; mock `suggest-listing/vetting-unavailable`, `self`, `invalid`): the
// form asks who and what kind, the details and the permission, beside "What happens next"; Myself
// changes the labels and drops the email and the permission; a missing name or place sends nothing.
test.describe('Member app, suggest a listing: the form', () => {
  test('the form asks who, what kind and the details, beside the four steps in order', async ({
    page,
  }) => {
    const suggest = new WebSuggestListingPage(page);

    await suggest.open();

    await expect(page).toHaveTitle('Suggest a listing · Christian Fitness');
    await expect(suggest.backLink).toHaveText('Directory');
    await expect(suggest.backLink).toHaveAttribute('href', '/directory');
    await expect(suggest.heading).toHaveText('Suggest a listing');
    await expect(suggest.lead).toHaveText(
      'Know a church ministry, club, coach or business that belongs here? Tell us about them and we’ll do the checking.',
    );
    expect(await suggest.choices('relations')).toEqual({
      labels: ['Myself', 'Someone I know', 'Somewhere I’ve been'],
      chosen: 'Someone I know',
    });
    expect(await suggest.relationDescriptions()).toEqual([
      'I run it or I am them',
      'A friend, coach or group',
      'I went and loved it',
    ]);
    expect(await suggest.choices('kinds')).toEqual({
      labels: ['Organization', 'Person', 'Instructor', 'Ambassador', 'Company', 'Church Ministry'],
      chosen: 'Organization',
    });
    expect(await suggest.fieldViews()).toEqual([
      { label: 'Their name', value: '', hint: null, error: null, invalid: false },
      { label: 'Where they meet or work', value: '', hint: null, error: null, invalid: false },
      { label: 'Website or social (optional)', value: '', hint: null, error: null, invalid: false },
      {
        label: 'Church connection (optional)',
        value: '',
        hint: 'For example: meets at Danforth Baptist',
        error: null,
        invalid: false,
      },
      { label: 'Why should they be listed?', value: '', hint: null, error: null, invalid: false },
      {
        label: 'Their email (optional)',
        value: '',
        hint: 'So we can reach them directly',
        error: null,
        invalid: false,
      },
    ]);
    await expect(suggest.tell).toBeChecked();
    await expect(suggest.sendButton).toHaveText('Send suggestion');
    await expect(suggest.sentAs).toHaveText('Sent as Grace Thompson');
    await expect(suggest.asideHeading).toHaveText('What happens next');
    expect(await suggest.stepViews()).toEqual(STEPS);
    // No story can be published before the publishing journeys (ADR 0085): `vetting-unavailable`.
    await expect(suggest.vettingLink).toHaveCount(0);
  });

  test('Myself changes the name and reason labels and drops the email and the permission', async ({
    page,
  }) => {
    const suggest = new WebSuggestListingPage(page);
    await suggest.open();
    await suggest.name.fill('Coach Marcus Delaney');

    await suggest.relation('Myself').check();

    expect((await suggest.fieldViews()).map((field) => field.label)).toEqual([
      'Your name or your organization’s',
      'Where they meet or work',
      'Website or social (optional)',
      'Church connection (optional)',
      'What should members know about you?',
    ]);
    await expect(suggest.email).toHaveCount(0);
    await expect(suggest.tell).toHaveCount(0);
    await expect(suggest.name).toHaveValue('Coach Marcus Delaney');

    await suggest.relation('Somewhere I’ve been').check();

    await expect(suggest.form.locator('label[for="f-name"]')).toHaveText('Their name');
    await expect(suggest.email).toBeVisible();
    await expect(suggest.tell).toBeChecked();
  });

  test('a missing name or place sends nothing and marks the field, focusing the first', async ({
    page,
    api,
  }) => {
    const sent: unknown[] = [];
    api.on('POST', SUGGESTIONS, (request) => {
      sent.push(request.postDataJSON());
      return { status: 201, json: { id: 'x', name: 'x' } };
    });
    const suggest = new WebSuggestListingPage(page);
    await suggest.open();

    await suggest.sendButton.click();

    const fields = await suggest.fieldViews();
    expect(fields[0]).toEqual({
      label: 'Their name',
      value: '',
      hint: null,
      error: 'Add a name so we know who to look up.',
      invalid: true,
    });
    expect(fields[1]).toEqual({
      label: 'Where they meet or work',
      value: '',
      hint: null,
      error: 'Add where they meet or work.',
      invalid: true,
    });
    expect(fields.slice(2).every((field) => !field.invalid)).toBe(true);
    await expect(suggest.name).toBeFocused();

    await suggest.name.fill('Eastside Ladies Who Lift');
    await expect(suggest.name).not.toHaveAttribute('aria-invalid', 'true');
    await suggest.sendButton.click();

    await expect(suggest.where).toBeFocused();
    await expect(suggest.where).toHaveAttribute('aria-invalid', 'true');
    expect(sent).toEqual([]);
  });
});

/** The mock's suggestion as the screen sends it: trimmed, a blank optional text as null. */
const MOCK_SENT = {
  relation: 'someone-i-know',
  kind: 'organization',
  name: 'Eastside Ladies Who Lift',
  where: 'Danforth & Pape, Toronto',
  website: 'instagram.com/eastsideladieslift',
  churchConnection: null,
  reason:
    'Saturday morning strength group out of Danforth Baptist. About 25 women, coached by a CSEP trainer.',
  email: null,
  mayTellWhoSuggested: true,
};

const STORED = { id: '0193b1c0-0000-7000-8000-00000000e001', name: 'Eastside Ladies Who Lift' };

// L2-062 AC5 and AC6 (ADR 0085; mock `submitting`, `success`, `error`): a valid suggestion is sent,
// the button reads "Sending…" meanwhile, and the thanks replaces the form; a failure keeps it all.
test.describe('Member app, suggest a listing: sending', () => {
  test('while it is on its way the button reads Sending… and the form holds still, then the thanks replaces it', async ({
    page,
    api,
  }) => {
    let answer: () => void = () => undefined;
    const answered = new Promise<void>((resolve) => (answer = resolve));
    api.on('POST', SUGGESTIONS, async () => {
      await answered;
      return { status: 201, json: STORED };
    });
    const suggest = new WebSuggestListingPage(page);
    await suggest.open();
    await suggest.fillMockSuggestion();
    await suggest.name.fill('  Eastside Ladies Who Lift ');

    const request = await suggest.sendAndAwaitRequest();

    expect(request.postDataJSON()).toEqual(MOCK_SENT);
    await expect(suggest.sendButton).toHaveText('Sending…');
    await expect(suggest.sendButton).toBeDisabled();
    await expect(suggest.sendButton).toHaveAttribute('aria-busy', 'true');
    await expect(suggest.name).toHaveJSProperty('readOnly', true);
    await expect(suggest.reason).toHaveJSProperty('readOnly', true);
    await expect(suggest.relation('Myself')).toBeDisabled();
    await expect(suggest.kind('Person')).toBeDisabled();
    await expect(suggest.tell).toBeDisabled();

    answer();

    await expect(suggest.done).toHaveAttribute('role', 'status');
    await expect(suggest.done).toBeFocused();
    await expect(suggest.doneTitle).toHaveText('Thanks, Grace');
    await expect(suggest.doneText).toHaveText(
      'We’ve got your suggestion for Eastside Ladies Who Lift. Our team will look into it this week, and we’ll message you here when it’s decided either way.',
    );
    await expect(suggest.doneName).toHaveText('Eastside Ladies Who Lift');
    await expect(suggest.form).toHaveCount(0);
    await expect(suggest.backToDirectory).toHaveAttribute('href', '/directory');
    expect(await suggest.stepViews()).toHaveLength(4);

    await suggest.suggestAnother.click();

    await expect(suggest.done).toHaveCount(0);
    expect(await suggest.choices('relations')).toMatchObject({ chosen: 'Someone I know' });
    expect(await suggest.choices('kinds')).toMatchObject({ chosen: 'Organization' });
    expect((await suggest.fieldViews()).map((field) => field.value)).toEqual([
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    await expect(suggest.tell).toBeChecked();
    await expect(suggest.sendButton).toHaveText('Send suggestion');
  });

  test('Myself sends no email and no permission, and the thanks names who was suggested', async ({
    page,
    api,
  }) => {
    api.on('POST', SUGGESTIONS, () => ({
      status: 201,
      json: { id: STORED.id, name: 'Coach Marcus Delaney' },
    }));
    const suggest = new WebSuggestListingPage(page);
    await suggest.open();
    await suggest.email.fill('marcus@delaney.example');
    await suggest.relation('Myself').check();
    await suggest.chooseKind('Instructor');
    await suggest.name.fill('Coach Marcus Delaney');
    await suggest.where.fill('Mississauga');
    await suggest.church.fill('Hope Church Mississauga');

    const request = await suggest.sendAndAwaitRequest();

    expect(request.postDataJSON()).toEqual({
      relation: 'myself',
      kind: 'instructor',
      name: 'Coach Marcus Delaney',
      where: 'Mississauga',
      website: null,
      churchConnection: 'Hope Church Mississauga',
      reason: null,
    });
    await expect(suggest.doneName).toHaveText('Coach Marcus Delaney');
  });

  for (const failure of [
    { why: 'a server error', reply: { status: 500, json: { code: 'server_error' } } },
    { why: 'no answer', reply: { abort: true } },
  ]) {
    test(`${failure.why} shows a message above the form and keeps everything typed`, async ({
      page,
      api,
    }) => {
      api.on('POST', SUGGESTIONS, () => failure.reply);
      const suggest = new WebSuggestListingPage(page);
      await suggest.open();
      await suggest.relation('Somewhere I’ve been').check();
      await suggest.chooseKind('Company');
      await suggest.fillMockSuggestion();
      await suggest.church.fill('Danforth Baptist');
      await suggest.email.fill('lead@eastside.example');
      await suggest.tell.uncheck();
      const before = await suggest.fieldViews();

      await suggest.sendAndAwaitRequest();

      await expect(suggest.alert).toHaveAttribute('role', 'alert');
      await expect(suggest.alert).toBeFocused();
      await expect(suggest.alertTitle).toHaveText("We couldn't send your suggestion");
      await expect(suggest.alertText).toHaveText(
        'Something went wrong on our side. Everything you typed is still here, so try again in a moment.',
      );
      expect(await suggest.fieldViews()).toEqual(before);
      expect(await suggest.choices('relations')).toMatchObject({ chosen: 'Somewhere I’ve been' });
      expect(await suggest.choices('kinds')).toMatchObject({ chosen: 'Company' });
      await expect(suggest.tell).not.toBeChecked();
      await expect(suggest.sendButton).toHaveText('Send suggestion');
      await expect(suggest.sendButton).toBeEnabled();
    });
  }
});

function problem(status: number, code: string, fieldCodes?: Record<string, string>) {
  return {
    status,
    headers: { 'content-type': 'application/problem+json' },
    json: { title: 'Refused', status, code, ...(fieldCodes ? { fieldCodes } : {}) },
  };
}

// L2-062 AC7, AC8 and AC11 (ADR 0085's stand-in copy): the API's refusals keep everything typed;
// a refused field is marked with its code's sentence, and the limits say why in the alert.
test.describe('Member app, suggest a listing: refusals', () => {
  test('a field the API refuses is marked with its sentence and focus moves to the first', async ({
    page,
    api,
  }) => {
    api.on('POST', SUGGESTIONS, () =>
      problem(400, 'validation_failed', {
        website: 'website_invalid',
        email: 'email_invalid',
        reason: 'reason_too_long',
      }),
    );
    const suggest = new WebSuggestListingPage(page);
    await suggest.open();
    await suggest.fillMockSuggestion();
    await suggest.website.fill('http://eastside.example');
    await suggest.email.fill('lead at eastside');

    await suggest.sendAndAwaitRequest();

    await expect(suggest.alertTitle).toHaveText('Check the highlighted fields');
    await expect(suggest.website).toBeFocused();
    const fields = await suggest.fieldViews();
    expect(fields.map(({ label, error, invalid }) => ({ label, error, invalid }))).toEqual([
      { label: 'Their name', error: null, invalid: false },
      { label: 'Where they meet or work', error: null, invalid: false },
      {
        label: 'Website or social (optional)',
        error: 'Enter a web address that starts with https://, or leave it empty.',
        invalid: true,
      },
      { label: 'Church connection (optional)', error: null, invalid: false },
      {
        label: 'Why should they be listed?',
        error: 'Keep it to 1,000 characters.',
        invalid: true,
      },
      {
        label: 'Their email (optional)',
        error: 'Enter an email address like name@example.com',
        invalid: true,
      },
    ]);
    await expect(suggest.website).toHaveValue('http://eastside.example');

    await suggest.website.fill('https://eastside.example');
    await expect(suggest.website).not.toHaveAttribute('aria-invalid', 'true');
  });

  for (const refusal of [
    {
      code: 'too_many_attempts',
      status: 429,
      title: "You've sent 5 suggestions today",
      text: 'You can suggest more tomorrow. Everything you typed is still here.',
    },
    {
      code: 'account_suspended',
      status: 403,
      title: 'Your account is suspended',
      text: "Suggestions can't be sent while your account is suspended.",
    },
  ]) {
    test(`${refusal.code} says why above the form and keeps everything typed`, async ({
      page,
      api,
    }) => {
      api.on('POST', SUGGESTIONS, () => problem(refusal.status, refusal.code));
      const suggest = new WebSuggestListingPage(page);
      await suggest.open();
      await suggest.fillMockSuggestion();
      const before = await suggest.fieldViews();

      await suggest.sendAndAwaitRequest();

      await expect(suggest.alert).toBeFocused();
      await expect(suggest.alertTitle).toHaveText(refusal.title);
      await expect(suggest.alertText).toHaveText(refusal.text);
      expect(await suggest.fieldViews()).toEqual(before);
      await expect(suggest.sendButton).toBeEnabled();
    });
  }
});

// L2-062 AC1 (mocks `directory/default`, `directory/no-results`): the directory leads to the form
// from under its heading and from a search that finds no one.
test.describe('Member app, suggest a listing: from the directory', () => {
  test('"Know someone who belongs here? Suggest a listing" under the heading opens the form', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open();

    await directory.suggestLink.click();

    await expect(page).toHaveURL(/\/directory\/suggest$/);
    await expect(new WebSuggestListingPage(page).heading).toHaveText('Suggest a listing');
  });

  test('a search with no match offers Suggest a listing beside Clear search', async ({
    page,
    api,
  }) => {
    answerDirectory(api, CAST);
    const directory = new WebDirectoryPage(page);
    await directory.open();
    await directory.typeSearch('aquafit');
    await expect(directory.noResultsHeading).toBeVisible();

    await directory.noResultsSuggest.click();

    await expect(page).toHaveURL(/\/directory\/suggest$/);
    await expect(new WebSuggestListingPage(page).heading).toHaveText('Suggest a listing');
  });
});
