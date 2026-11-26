import type { Locator, Page } from '@playwright/test';

/** One event row of the rail's "Upcoming events". */
export interface LandingRow {
  href: string | null;
  month: string;
  day: string;
  title: string;
  meta: string;
}

/** One story as the front page shows it. */
export interface LandingStory {
  href: string | null;
  section: string;
  title: string;
  summary: string | null;
  meta: string;
  image: boolean;
}

/** The member app's public news front page at `/`. Owns the selectors of that screen. */
export class WebLandingPage {
  readonly heading: Locator;
  readonly masthead: Locator;
  readonly joinFree: Locator;
  readonly signIn: Locator;
  readonly sections: Locator;
  readonly currentSection: Locator;
  readonly topStories: Locator;
  readonly lead: Locator;
  readonly headlines: Locator;
  readonly river: Locator;
  readonly riverTitle: Locator;
  readonly riverRows: Locator;
  readonly riverEmpty: Locator;
  readonly storiesError: Locator;
  readonly storiesTryAgain: Locator;
  readonly moreStories: Locator;
  readonly moreError: Locator;
  readonly moreTryAgain: Locator;
  readonly riverEnd: Locator;
  readonly rail: Locator;
  readonly joinCard: Locator;
  readonly joinTheCommunity: Locator;
  readonly rows: Locator;
  readonly events: Locator;
  readonly eventsError: Locator;
  readonly eventsTryAgain: Locator;
  readonly mostRead: Locator;
  readonly mostReadRows: Locator;
  readonly verse: Locator;

  footerLink(name: string) {
    return this.page.getByRole('contentinfo').getByRole('link', { name, exact: true });
  }

  section(name: string): Locator {
    return this.sections.getByRole('link', { name, exact: true });
  }

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.masthead = page.locator('.masthead');
    this.joinFree = this.masthead.getByRole('link', { name: 'Join free' });
    this.signIn = this.masthead.getByRole('link', { name: 'Sign in' });
    this.sections = page.getByRole('navigation', { name: 'Sections' });
    this.currentSection = this.sections.locator('[aria-current="page"]');
    this.topStories = page.getByRole('region', { name: 'Top stories' });
    this.lead = page.locator('.story-lead');
    this.headlines = page.locator('.headline-list .headline');
    this.river = page.getByRole('region', { name: 'Stories', exact: true });
    this.riverTitle = this.river.locator('.river__title');
    this.riverRows = this.river.locator('.story-row');
    this.riverEmpty = this.river.locator('.river__empty');
    this.storiesError = this.river.locator('.river__error .inline-error');
    this.storiesTryAgain = this.storiesError.getByRole('button', { name: 'Try again' });
    this.moreStories = this.river.getByRole('button', { name: 'More stories' });
    this.moreError = this.river.locator('.feed-end .inline-error');
    this.moreTryAgain = this.moreError.getByRole('button', { name: 'Try again' });
    this.riverEnd = this.river.locator('.feed-end');
    this.rail = page.getByRole('complementary', { name: 'Join, events and newsletter' });
    this.joinCard = this.rail.locator('.join-card');
    this.joinTheCommunity = this.joinCard.getByRole('link', { name: 'Join the community' });
    this.events = this.rail.getByRole('region', { name: 'Upcoming events' });
    this.rows = this.events.locator('.event-row');
    this.eventsError = this.events.locator('.inline-error');
    this.eventsTryAgain = this.eventsError.getByRole('button', { name: 'Try again' });
    this.mostRead = this.rail.getByRole('region', { name: 'Most read' });
    this.mostReadRows = this.mostRead.locator('.ranked li');
    this.verse = page.locator('.verse__quote');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/${query}`);
  }

  /** The feeds the document head names: each `<link rel="alternate">` of type RSS, in order. */
  feeds(): Promise<{ title: string | null; href: string | null }[]> {
    return this.page
      .locator('head link[rel="alternate"][type="application/rss+xml"]')
      .evaluateAll((links) =>
        links.map((link) => ({
          title: link.getAttribute('title'),
          href: link.getAttribute('href'),
        })),
      );
  }

  /** The footer's links' words, in order. */
  async footerLinks(): Promise<string[]> {
    const words = await this.page.getByRole('contentinfo').getByRole('link').allTextContents();
    return words.map((w) => w.trim());
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Each rail event's date, title, meta and where it leads. */
  async eventRows(): Promise<LandingRow[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => ({
        href: row.getAttribute('href'),
        month: row.querySelector('.event-row__month')?.textContent?.trim() ?? '',
        day: row.querySelector('.event-row__day')?.textContent?.trim() ?? '',
        title: row.querySelector('.event-row__title')?.textContent?.trim() ?? '',
        meta: row.querySelector('.event-row__meta')?.textContent?.trim() ?? '',
      })),
    );
  }

  /** The lead, each headline or each river row: section, title, summary, meta and link. */
  async stories(which: 'lead' | 'headlines' | 'river'): Promise<LandingStory[]> {
    const rows = { lead: this.lead, headlines: this.headlines, river: this.riverRows }[which];
    return rows.evaluateAll((elements) =>
      elements.map((row) => {
        const text = (selector: string) =>
          row.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? null;
        return {
          href: row.querySelector('.story-link')?.getAttribute('href') ?? null,
          section: text('.story__section') ?? '',
          title: text('.story-link') ?? '',
          summary: text('.story-lead__dek, .story-row__dek'),
          meta: text('.story__meta') ?? '',
          image: row.querySelector('img') !== null,
        };
      }),
    );
  }

  /** "Most read" as the visitor reads it: each title and where it leads, in order. */
  async mostReadStories(): Promise<{ n: string; title: string; href: string | null }[]> {
    return this.mostReadRows.evaluateAll((rows) =>
      rows.map((row) => ({
        n: row.querySelector('.ranked__n')?.textContent?.trim() ?? '',
        title: row.querySelector('a')?.textContent?.trim() ?? '',
        href: row.querySelector('a')?.getAttribute('href') ?? null,
      })),
    );
  }

  /** Whether the page is wider than the viewport. */
  overflowsHorizontally(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }

  /** The masthead's top edge after scrolling to the bottom: 0 while it stays at the top. */
  async mastheadTopAfterScrolling(): Promise<number> {
    await this.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    return this.masthead.evaluate((element) => Math.round(element.getBoundingClientRect().top));
  }

  /** The bounding boxes of `a` and `b`, to compare their places. */
  async boxes(a: Locator, b: Locator) {
    return { a: await a.boundingBox(), b: await b.boundingBox() };
  }
}
