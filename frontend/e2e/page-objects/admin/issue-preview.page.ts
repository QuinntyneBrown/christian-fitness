import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's issue preview (journey 28; L2-070 AC9): the banner saying it is a preview, the
 * issue as the web version draws it, and the loading and error states. Owns its selectors.
 */
export class IssuePreviewPage {
  readonly main: Locator;
  readonly banner: Locator;
  readonly closeLink: Locator;
  readonly article: Locator;
  readonly name: Locator;
  readonly date: Locator;
  readonly greeting: Locator;
  readonly leadTitle: Locator;
  readonly readTheStory: Locator;
  readonly briefs: Locator;
  readonly loading: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly backToDesk: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.banner = this.main.locator('.banner');
    this.closeLink = this.main.getByRole('link', { name: 'Close preview' });
    this.article = this.main.getByRole('article');
    this.name = this.article.getByRole('heading', { level: 1 });
    this.date = this.article.locator('.issue__date');
    this.greeting = this.article.locator('.issue__greeting');
    this.leadTitle = this.article.locator('.issue__lead-title');
    this.readTheStory = this.article.getByRole('link', { name: 'Read the story' });
    this.briefs = this.article.locator('.headline');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.errorTitle = this.main.locator('.error-state .empty-state__title');
    this.tryAgainButton = this.main.getByRole('button', { name: 'Try again' });
    this.backToDesk = this.main.getByRole('link', { name: 'Back to Newsletter' });
  }

  async open(issue: number | string): Promise<void> {
    await this.page.goto(`/newsletter/preview?issue=${issue}`);
  }

  path(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
