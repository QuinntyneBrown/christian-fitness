import { expect, test } from '../fixtures/test';
import { WebSuggestListingPage } from '../page-objects/web/suggest-listing.page';

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

// L2-062 AC2 to AC4 (ADR 0084; mock `suggest-listing/vetting-unavailable`, `self`, `invalid`): the
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
    // No story can be published before the publishing journeys (ADR 0084): `vetting-unavailable`.
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
