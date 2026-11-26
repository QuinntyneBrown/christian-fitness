import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/** The head of a story as a reader reads it. */
export interface StoryHeadView {
  section: string;
  headline: string;
  summary: string | null;
  author: string;
  when: string;
}

/**
 * The member app's story page at `/stories/:slug` (mock `docs/mocks/pages/story/`): the masthead
 * for a visitor or the member header, the back link, the head with Copy link, the figure, the
 * body, the next step card, Keep reading and the Weekly box, and the loading, error and not-found
 * states. Owns the selectors of that screen; the not-found view is read through
 * {@link ErrorScreen}.
 */
export class WebStoryPage extends ErrorScreen {
  /** The visitor's masthead (the top bar's `site` form). */
  readonly masthead: Locator;
  readonly mastheadSignIn: Locator;
  readonly mastheadJoin: Locator;
  /** The signed-in member's header (`app-header`). */
  readonly memberHeader: Locator;
  readonly article: Locator;
  readonly backLink: Locator;
  readonly headlines: Locator;
  readonly image: Locator;
  /** The paragraphs of the body, quotes excluded. */
  readonly paragraphs: Locator;
  readonly quotes: Locator;
  readonly loading: Locator;
  readonly failure: Locator;
  readonly tryAgain: Locator;
  readonly allStories: Locator;

  constructor(page: Page) {
    super(page);
    this.masthead = page.locator('.site-header');
    this.mastheadSignIn = this.masthead.getByRole('link', { name: 'Sign in' });
    this.mastheadJoin = this.masthead.getByRole('link', { name: 'Join free' });
    this.memberHeader = page.locator('.app-header');
    this.article = page.locator('article.story');
    this.backLink = this.article.locator('.back-link');
    this.headlines = page.getByRole('heading', { level: 1 });
    this.image = this.article.locator('.story__image');
    this.paragraphs = this.article.locator('.story__body > p');
    this.quotes = this.article.locator('.story__quote');
    this.loading = page.locator('[aria-busy="true"]');
    this.failure = this.main.getByRole('alert').filter({ hasText: "This story didn't load" });
    this.tryAgain = this.failure.getByRole('button', { name: 'Try again' });
    this.allStories = this.failure.getByRole('link', { name: 'All stories' });
  }

  async open(slug: string): Promise<void> {
    await this.page.goto(`/stories/${slug}`);
  }

  async headView(): Promise<StoryHeadView> {
    const head = this.article.locator('.story__head');
    const dek = head.locator('.story__dek');
    return {
      section: await head.locator('.story__section').innerText(),
      headline: await head.getByRole('heading', { level: 1 }).innerText(),
      summary: (await dek.count()) ? await dek.innerText() : null,
      author: await head.locator('.story__author').innerText(),
      when: await head.locator('.story__when').innerText(),
    };
  }

  /** The document's `description` meta, or none. */
  description(): Promise<string | null> {
    return this.page.locator('meta[name="description"]').getAttribute('content');
  }
}
