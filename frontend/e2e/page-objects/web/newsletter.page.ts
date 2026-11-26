import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Newsletter page (mock `docs/mocks/pages/newsletter/`): the bar above the issue,
 * the issue itself, and the loading, error and not-found states. Owns the selectors of that screen.
 */
export class NewsletterPage {
  readonly bar: Locator;
  readonly backLink: Locator;
  readonly barText: Locator;
  readonly main: Locator;
  readonly article: Locator;
  readonly headings: Locator;
  readonly name: Locator;
  readonly date: Locator;
  readonly greeting: Locator;
  readonly note: Locator;
  readonly leadSection: Locator;
  readonly leadTitle: Locator;
  readonly readTheStory: Locator;
  readonly calendarRows: Locator;
  readonly seeEveryEvent: Locator;
  readonly briefs: Locator;
  readonly briefLinks: Locator;
  readonly quote: Locator;
  readonly cite: Locator;
  readonly footerLinks: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly backToNews: Locator;
  readonly notFoundHeading: Locator;

  constructor(private readonly page: Page) {
    this.bar = page.locator('.issue-page__bar');
    this.backLink = this.bar.getByRole('link', { name: 'Christian Fitness' });
    this.barText = this.bar.locator('span').last();
    this.main = page.getByRole('main');
    this.article = this.main.getByRole('article');
    this.headings = this.main.locator('h1, h2, h3');
    this.name = this.article.getByRole('heading', { level: 1 });
    this.date = this.article.locator('.issue__date');
    this.greeting = this.article.locator('.issue__greeting');
    this.note = this.article.locator('.issue__text').first();
    this.leadSection = this.article.locator('.story__section').first();
    this.leadTitle = this.article.locator('.issue__lead-title');
    this.readTheStory = this.article.getByRole('link', { name: 'Read the story' });
    this.calendarRows = this.article.locator('.event-row');
    this.seeEveryEvent = this.article.getByRole('link', { name: 'See every event' });
    this.briefs = this.article.locator('.headline');
    this.briefLinks = this.article.locator('.headline__title a');
    this.quote = this.article.locator('.issue__quote');
    this.cite = this.article.locator('.issue__cite');
    this.footerLinks = this.article.locator('.issue__links a');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.backToNews = this.error.getByRole('link', { name: 'Back to news' });
    this.notFoundHeading = this.main.getByRole('heading', { name: 'Page not found' });
  }

  async open(number?: number | string): Promise<void> {
    await this.page.goto(number === undefined ? '/newsletter' : `/newsletter/${number}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  path(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.hash;
  }

  /** Each heading's level and words, in document order. */
  headingOutline(): Promise<[string, string][]> {
    return this.headings.evaluateAll((all) =>
      all.map((h) => [h.tagName, h.textContent?.replace(/\s+/g, ' ').trim() ?? '']),
    );
  }

  /** Each calendar row: month, day, title and meta. */
  calendar(): Promise<string[][]> {
    return this.calendarRows.evaluateAll((rows) =>
      rows.map((row) =>
        ['.event-row__month', '.event-row__day', '.event-row__title', '.event-row__meta'].map(
          (part) => row.querySelector(part)?.textContent?.trim() ?? '',
        ),
      ),
    );
  }

  /** Each brief: section, title, where it leads and its author. */
  briefValues(): Promise<(string | null)[][]> {
    return this.briefs.evaluateAll((rows) =>
      rows.map((row) => [
        row.querySelector('.story__section')?.textContent?.trim() ?? '',
        row.querySelector('.headline__title')?.textContent?.trim() ?? '',
        row.querySelector('.headline__title a')?.getAttribute('href') ?? null,
        row.querySelector('.story__meta')?.textContent?.trim() ?? '',
      ]),
    );
  }

  /** The widest the issue is drawn, in rem, and how far the page overflows sideways. */
  measure(): Promise<{ widthRem: number; overflowX: number }> {
    return this.article.evaluate((article) => ({
      widthRem:
        article.getBoundingClientRect().width /
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
  }
}
