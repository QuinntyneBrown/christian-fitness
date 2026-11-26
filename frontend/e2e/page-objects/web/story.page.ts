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
  readonly copyLink: Locator;
  /** The visually hidden `status` beside Copy link. */
  readonly copyStatus: Locator;
  /** The read-only address shown when the clipboard refuses. */
  readonly address: Locator;
  /** The `story-next` card, a link. */
  readonly next: Locator;
  readonly nextLabel: Locator;
  readonly nextTitle: Locator;

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
    const byline = this.article.locator('.story__byline');
    this.copyLink = byline.getByRole('button');
    this.copyStatus = byline.getByRole('status');
    this.address = this.article.getByRole('textbox', { name: 'Story address' });
    this.next = this.article.locator('.story-next');
    this.nextLabel = this.next.locator('.story-next__label');
    this.nextTitle = this.next.locator('.story-next__title');
  }

  /** The "Keep reading" section. */
  get keepReading(): Locator {
    return this.page.locator('.story-more');
  }

  get cards(): Locator {
    return this.keepReading.locator('.story-card');
  }

  /** The Weekly box under Keep reading. */
  get subscribe(): Locator {
    return this.page.locator('.story-subscribe');
  }

  /** Each Keep reading card as a reader reads it. */
  async cardViews(): Promise<
    { href: string | null; image: string | null; section: string; title: string; meta: string }[]
  > {
    const views = [];
    for (const card of await this.cards.all()) {
      const image = card.locator('.story-card__image');
      views.push({
        href: await card.getAttribute('href'),
        image: (await image.count()) ? await image.getAttribute('src') : null,
        section: await card.locator('.story-card__section').innerText(),
        title: await card.locator('.story-card__title').innerText(),
        meta: await card.locator('.story__meta').innerText(),
      });
    }
    return views;
  }

  /** What the clipboard holds now. */
  clipboard(): Promise<string> {
    return this.page.evaluate(() => navigator.clipboard.readText());
  }

  /** The address field's selection, as [start, end]. */
  addressSelection(): Promise<[number | null, number | null]> {
    return this.address.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
  }

  /** Marks the document, so a later check can tell whether a click reloaded it. */
  async markDocument(): Promise<void> {
    await this.page.evaluate(() => document.documentElement.setAttribute('data-e2e-mark', '1'));
  }

  /** Whether the document marked by `markDocument` is still the one showing (no reload). */
  isSameDocument(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.getAttribute('data-e2e-mark') === '1');
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
