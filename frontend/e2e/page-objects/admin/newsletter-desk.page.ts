import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Newsletter desk (mock `docs/mocks/pages/admin-newsletter/`): the heading, the
 * next issue's fields and picks, the send card and its actions, the Sent table, and the loading
 * and error states. Owns the selectors of that screen.
 */
export class NewsletterDeskPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly issue: Locator;
  readonly issueTitle: Locator;
  readonly status: Locator;
  readonly saved: Locator;
  readonly subject: Locator;
  readonly note: Locator;
  readonly lead: Locator;
  readonly also: Locator;
  readonly alsoLegend: Locator;
  readonly alsoRows: Locator;
  readonly alsoBoxes: Locator;
  readonly events: Locator;
  readonly eventsHint: Locator;
  readonly eventToggles: Locator;
  readonly verse: Locator;
  readonly reference: Locator;
  readonly fieldErrors: Locator;
  readonly send: Locator;
  readonly sendLabel: Locator;
  readonly sendDate: Locator;
  readonly sendMeta: Locator;
  readonly scheduleButton: Locator;
  readonly unscheduleButton: Locator;
  readonly rescheduleButton: Locator;
  readonly sendTime: Locator;
  readonly sendTimeHint: Locator;
  readonly failure: Locator;
  readonly previewLink: Locator;
  readonly testButton: Locator;
  readonly testStatus: Locator;
  readonly addOnNote: Locator;
  readonly sentHeading: Locator;
  readonly sentRows: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.issue = this.main.getByRole('region', { name: /^Issue #/ });
    this.issueTitle = this.main.locator('.builder__title');
    this.status = this.issue.locator('.status');
    this.saved = this.issue.locator('.editor__saved');
    this.subject = this.main.getByRole('textbox', { name: 'Subject line' });
    this.note = this.main.getByRole('textbox', { name: 'Editor’s note' });
    this.lead = this.main.getByRole('combobox', { name: 'The big story' });
    this.also = this.main.getByRole('group', { name: /^Also this week/ });
    this.alsoLegend = this.also.locator('legend');
    this.alsoRows = this.also.locator('.pick-row');
    this.alsoBoxes = this.also.getByRole('checkbox');
    this.events = this.main.getByRole('group', { name: 'Events this week' });
    this.eventsHint = this.events.locator('.field__hint');
    this.eventToggles = this.events.locator('.interest');
    this.verse = this.main.getByRole('textbox', { name: 'Verse to carry' });
    this.reference = this.main.getByRole('textbox', { name: 'Reference' });
    this.fieldErrors = this.main.locator('.field__error');
    this.send = this.main.getByRole('complementary', { name: 'Send' });
    this.sendLabel = this.send.locator('.send-card__label');
    this.sendDate = this.send.locator('.send-card__date');
    this.sendMeta = this.send.locator('.send-card__meta');
    this.scheduleButton = this.send.getByRole('button', { name: /^Schedul/ });
    this.unscheduleButton = this.send.getByRole('button', { name: /^Unschedul/ });
    this.rescheduleButton = this.send.getByRole('button', { name: /^Reschedul/ });
    this.sendTime = this.send.getByLabel('Send later today at');
    this.sendTimeHint = this.send.locator('.field__hint');
    this.failure = this.send.getByRole('alert');
    this.previewLink = this.send.getByRole('link', { name: 'Preview' });
    this.testButton = this.send.getByRole('button', { name: /test/i });
    this.testStatus = this.send.locator('p[role="status"]');
    this.addOnNote = this.send.locator('.builder__note');
    this.sentHeading = this.main.getByRole('heading', { name: 'Sent' });
    this.sentRows = this.main.getByRole('table', { name: 'Sent issues' }).locator('tbody tr');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
  }

  async open(): Promise<void> {
    await this.page.goto('/newsletter');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  alsoBox(headline: string | RegExp): Locator {
    return this.also.getByRole('checkbox', { name: headline });
  }

  eventToggle(title: string): Locator {
    return this.events.getByRole('button', { name: title, exact: true });
  }

  /** Each "Also this week" row: its headline, its meta, ticked, unavailable. */
  alsoRowValues(): Promise<[string, string, boolean, boolean][]> {
    return this.alsoRows.evaluateAll((rows) =>
      rows.map((row) => {
        const box = row.querySelector('input')!;
        return [
          row.querySelector('.pick-row__title')?.textContent?.trim() ?? '',
          row.querySelector('.pick-row__meta')?.textContent?.trim() ?? '',
          box.checked,
          box.disabled,
        ];
      }),
    );
  }

  /** Each event toggle's title and whether it is pressed. */
  eventValues(): Promise<[string, string | null][]> {
    return this.eventToggles.evaluateAll((toggles) =>
      toggles.map((t) => [t.textContent?.trim() ?? '', t.getAttribute('aria-pressed')]),
    );
  }

  /** The big story's options, as their texts. */
  leadOptions(): Promise<string[]> {
    return this.lead.locator('option').allTextContents();
  }

  /** Each sent row's cells, as text. */
  sentRowTexts(): Promise<string[][]> {
    return this.sentRows.evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('th, td')).map(
          (c) => c.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ),
      ),
    );
  }

  /** The error under a field, by the field's input. */
  errorOf(field: Locator): Promise<string | null> {
    return field.evaluate((input) => {
      const id = input
        .getAttribute('aria-describedby')
        ?.split(' ')
        .find((part) => part.endsWith('-error'));
      return id ? (document.getElementById(id)?.textContent?.trim() ?? null) : null;
    });
  }
}
