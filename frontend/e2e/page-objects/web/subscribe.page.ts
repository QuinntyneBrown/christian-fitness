import type { Locator, Page } from '@playwright/test';

/** One row of the feed list, as a reader sees it. */
export interface FeedRow {
  name: string;
  count: string;
  url: string;
  copy: string;
  feedly: string | null;
  all: boolean;
}

/**
 * The member app's Subscribe screen (mock `docs/mocks/pages/subscribe/`): the plain masthead, the
 * `subscribe` block with its form or a `subscribe__panel`, and the `rss` section with its
 * `feed-list`. Owns the selectors of that screen.
 */
export class WebSubscribePage {
  readonly masthead: Locator;
  readonly backToNews: Locator;
  readonly main: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly form: Locator;
  readonly email: Locator;
  readonly emailError: Locator;
  readonly submitButton: Locator;
  readonly note: Locator;
  readonly checking: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;
  readonly panelText: Locator;
  readonly panelEmail: Locator;
  readonly differentEmail: Locator;
  readonly subscribeAgain: Locator;
  /** The `form-alert` above the form, or above it for an expired link. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  readonly rss: Locator;
  readonly rssTitle: Locator;
  readonly rssText: Locator;
  readonly feeds: Locator;
  readonly copyStatus: Locator;

  constructor(private readonly page: Page) {
    this.masthead = page.getByRole('banner');
    this.backToNews = this.masthead.getByRole('link', { name: 'Back to news' });
    this.main = page.getByRole('main');
    const subscribe = this.main.locator('.subscribe');
    this.heading = subscribe.getByRole('heading', { level: 1 });
    this.lead = subscribe.locator('.subscribe__lead');
    this.form = subscribe.locator('.subscribe__form');
    this.email = this.form.getByLabel('Email address', { exact: true });
    this.emailError = this.form.locator('#f-email-error');
    this.submitButton = this.form.locator('.subscribe__row button.btn');
    this.note = this.form.locator('.subscribe__note');
    this.checking = subscribe.locator('.subscribe__checking');
    this.panel = subscribe.locator('.subscribe__panel');
    this.panelTitle = this.panel.locator('.subscribe__panel-title');
    this.panelText = this.panel.locator('.subscribe__panel-text');
    this.panelEmail = this.panelText.locator('strong');
    this.differentEmail = this.panel.getByRole('button', { name: 'Use a different email' });
    this.subscribeAgain = this.panel.getByRole('button', { name: 'Subscribe again' });
    this.alert = subscribe.locator('.subscribe__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.rss = this.main.locator('section.rss#rss');
    this.rssTitle = this.rss.locator('#rss-title');
    this.rssText = this.rss.locator('.rss__text');
    this.feeds = this.rss.locator('.feed-list > li.feed');
    this.copyStatus = this.rss.locator('p.visually-hidden[role="status"]');
  }

  async open(fragment?: string): Promise<void> {
    await this.page.goto(fragment ? `/subscribe#${fragment}` : '/subscribe');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path, query and fragment the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search + url.hash;
  }

  feed(name: string): Locator {
    return this.feeds.filter({ has: this.page.locator('.feed__name', { hasText: name }) });
  }

  copyButton(name: string): Locator {
    return this.feed(name).locator('.feed__copy button');
  }

  feedUrl(name: string): Locator {
    return this.feed(name).locator('.feed__url');
  }

  /** Each feed row's words and links, in order. */
  async feedRows(): Promise<FeedRow[]> {
    return this.feeds.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string) =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const count = text('.feed__count');
        return {
          name: text('.feed__name').replace(count, '').trim(),
          count,
          url: text('.feed__url'),
          copy: text('.feed__copy button'),
          feedly: row.querySelector('.feed__actions a')?.getAttribute('href') ?? null,
          all: row.classList.contains('feed--all'),
        };
      }),
    );
  }

  /** The Open in Feedly link of a feed. */
  feedly(name: string): Locator {
    return this.feed(name).getByRole('link', { name: /^Open in Feedly/ });
  }

  async subscribe(email: string): Promise<void> {
    await this.email.fill(email);
    await this.submitButton.click();
  }

  /** What the clipboard holds now. */
  clipboard(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /** The text the page has selected. */
  selection(): Promise<string> {
    return this.page.evaluate(() => document.getSelection()?.toString() ?? '');
  }
}
