import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Feedback inbox (mock `docs/mocks/pages/admin-feedback/`): the tabs, the list of
 * notes, the chosen note with its facts, replies, reply box and actions, the toast region, and the
 * loading, empty and error states. Owns the selectors of that screen.
 */
export class AdminFeedbackPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly tabs: Locator;
  readonly tabLinks: Locator;
  readonly currentTab: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly currentRow: Locator;
  readonly nothingHere: Locator;
  readonly detail: Locator;
  readonly kindTag: Locator;
  readonly status: Locator;
  readonly when: Locator;
  readonly noteHeading: Locator;
  readonly noteText: Locator;
  readonly facts: Locator;
  readonly senderEmail: Locator;
  readonly suspended: Locator;
  readonly storyLink: Locator;
  readonly screenshot: Locator;
  readonly replies: Locator;
  readonly reply: Locator;
  readonly replyHint: Locator;
  readonly replyError: Locator;
  readonly sendButton: Locator;
  readonly resolveButton: Locator;
  readonly reopenButton: Locator;
  readonly failure: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly error: Locator;
  readonly tryAgainButton: Locator;
  readonly toastTitle: Locator;
  readonly toastText: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.page-head .subtitle');
    this.tabs = this.main.getByRole('navigation', { name: 'Filter feedback' });
    this.tabLinks = this.tabs.getByRole('link');
    this.currentTab = this.tabs.locator('[aria-current="page"]');
    this.list = this.main.getByRole('navigation', { name: 'Feedback', exact: true });
    this.rows = this.list.locator('.feedback-row');
    this.currentRow = this.list.locator('.feedback-row[aria-current="page"]');
    this.nothingHere = this.main.locator('.feedback-list__empty');
    this.detail = this.main.locator('cf-feedback-detail');
    this.kindTag = this.detail.locator('.kind-tag');
    this.status = this.detail.locator('.feedback-detail__head .status');
    this.when = this.detail.locator('.feedback-detail__when');
    this.noteHeading = this.detail.getByRole('heading', { level: 2 });
    this.noteText = this.detail.locator('.feedback-detail__text');
    this.facts = this.detail.locator('.feedback-detail__strong');
    this.senderEmail = this.detail.locator('.feedback-detail__sub');
    this.suspended = this.detail.locator('.status--suspended');
    this.storyLink = this.detail.getByRole('link', { name: 'Open the story to correct it' });
    this.screenshot = this.detail.getByRole('img', { name: /^Screenshot from/ });
    this.replies = this.detail.locator('.feedback-thread__reply');
    this.reply = this.detail.getByRole('textbox', { name: /^Reply to/ });
    this.replyHint = this.detail.locator('.field__hint');
    this.replyError = this.detail.locator('.field__error');
    this.sendButton = this.detail.getByRole('button', { name: /^Send/ });
    this.resolveButton = this.detail.getByRole('button', { name: 'Mark resolved' });
    this.reopenButton = this.detail.getByRole('button', { name: 'Reopen' });
    this.failure = this.detail.getByRole('alert');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.empty = this.main.locator('.empty-state');
    this.error = this.main.locator('.error-state');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    const toasts = page.getByRole('region', { name: 'Notifications' });
    this.toastTitle = toasts.locator('.toast__title');
    this.toastText = toasts.locator('.toast__text');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/feedback${query}`);
  }

  path(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  tab(name: string): Locator {
    return this.tabs.getByRole('link', { name: new RegExp(`^${name}`) });
  }

  row(sender: string): Locator {
    return this.rows.filter({ hasText: sender });
  }

  /** Each tab's label with its count. */
  tabTexts(): Promise<string[]> {
    return this.tabLinks.evaluateAll((links) =>
      links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    );
  }

  /** Each row: who, when, the kind and status in words, and whether the sender is bold. */
  rowValues(): Promise<(string | boolean)[][]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => [
        row.querySelector('.feedback-row__from')?.textContent?.trim() ?? '',
        row.querySelector('.feedback-row__when')?.textContent?.trim() ?? '',
        row.querySelector('.visually-hidden')?.textContent?.trim() ?? '',
        row.querySelector('.feedback-row__from--new') !== null,
      ]),
    );
  }

  factTexts(): Promise<string[]> {
    return this.facts.evaluateAll((facts) =>
      facts.map((f) => f.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    );
  }

  /** How far the page overflows sideways, and whether the list comes before the note. */
  layout(): Promise<{ overflowX: number; listFirst: boolean; sideBySide: boolean }> {
    return this.page.evaluate(() => {
      const list = document.querySelector('nav[aria-label="Feedback"]')!.getBoundingClientRect();
      const note = document.querySelector('cf-feedback-detail')!.getBoundingClientRect();
      return {
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        listFirst: list.top < note.top,
        sideBySide: note.left >= list.right,
      };
    });
  }
}
