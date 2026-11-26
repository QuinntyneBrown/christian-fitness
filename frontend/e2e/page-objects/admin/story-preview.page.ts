import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's story preview (mock `docs/mocks/pages/admin-story-preview/`): the warning banner
 * that says it is a preview with "Close preview", and the story as readers will see it: section,
 * headline, summary, byline, lead image, body and the next step. Owns the selectors of that screen.
 */
export class StoryPreviewPage {
  readonly main: Locator;
  readonly banner: Locator;
  readonly closeLink: Locator;
  readonly story: Locator;
  readonly section: Locator;
  readonly heading: Locator;
  readonly dek: Locator;
  readonly author: Locator;
  readonly image: Locator;
  readonly body: Locator;
  /** The body's blocks in order: paragraphs, quotes, headings and lists. */
  readonly blocks: Locator;
  readonly quote: Locator;
  readonly bodyLinks: Locator;
  readonly next: Locator;
  readonly nextLabel: Locator;
  readonly nextTitle: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly tryAgainButton: Locator;
  readonly editorLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.banner = this.main.locator('.banner');
    this.closeLink = this.banner.getByRole('link', { name: 'Close preview' });
    this.story = this.main.locator('article.story');
    this.section = this.story.locator('.story__kicker');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.dek = this.story.locator('.story__dek');
    this.author = this.story.locator('.story__author');
    this.image = this.story.locator('.story__image');
    this.body = this.story.locator('.story__body');
    this.blocks = this.body.locator(':scope > :is(p, blockquote, h2, h3, ul, ol)');
    this.quote = this.body.locator('.story__quote');
    this.bodyLinks = this.body.locator(':scope > :is(p, blockquote, h2, h3, ul, ol) a');
    this.next = this.story.locator('.story-next');
    this.nextLabel = this.next.locator('.story-next__label');
    this.nextTitle = this.next.locator('.story-next__title');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.locator('.empty-state__title');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.editorLink = this.error.getByRole('link', { name: 'Back to the editor' });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/stories/${id}/preview`);
  }

  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
