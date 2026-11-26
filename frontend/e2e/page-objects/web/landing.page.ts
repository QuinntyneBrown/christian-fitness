import type { Locator, Page } from '@playwright/test';

/** One event row of the rail's "Upcoming events". */
export interface LandingRow {
  href: string | null;
  month: string;
  day: string;
  title: string;
  meta: string;
}

/** A story as the front page shows it; a part its form does not draw is empty. */
export interface LandingStory {
  href: string | null;
  section: string;
  title: string;
  summary: string;
  meta: string;
  image: string | null;
}

/** The member app's public landing page at `/`, the news front page. Owns the selectors of that screen. */
export class WebLandingPage {
  readonly heading: Locator;
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
  readonly storiesError: Locator;
  readonly storiesTryAgain: Locator;
  readonly storiesLoading: Locator;
  readonly moreStories: Locator;
  readonly moreError: Locator;
  readonly moreTryAgain: Locator;
  readonly riverEnd: Locator;
  readonly rail: Locator;
  readonly joinCard: Locator;
  readonly joinCommunity: Locator;
  readonly events: Locator;
  readonly rows: Locator;
  readonly eventsError: Locator;
  readonly eventsTryAgain: Locator;
  readonly mostRead: Locator;
  readonly mostReadRows: Locator;
  readonly verse: Locator;

  footerLink(name: string) {
    return this.page.getByRole('contentinfo').getByRole('link', { name, exact: true });
  }

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.joinFree = page.locator('.masthead').getByRole('link', { name: 'Join free' });
    this.signIn = page.locator('.masthead').getByRole('link', { name: 'Sign in' });
    this.sections = page.getByRole('navigation', { name: 'Sections' }).getByRole('link');
    this.currentSection = page.locator('.section-nav__link[aria-current="page"]');
    this.topStories = page.locator('.top-stories');
    this.lead = page.locator('.story-lead');
    this.headlines = page.locator('.headline');
    this.river = page.locator('.river');
    this.riverTitle = page.locator('.river__title');
    this.riverRows = page.locator('.story-row');
    this.storiesError = this.river.locator('.inline-error').first();
    this.storiesTryAgain = this.storiesError.getByRole('button', { name: 'Try again' });
    this.storiesLoading = page.getByText('Loading stories', { exact: true });
    this.moreStories = page.getByRole('button', { name: 'More stories' });
    this.moreError = page.locator('.feed-end .inline-error');
    this.moreTryAgain = this.moreError.getByRole('button', { name: 'Try again' });
    this.riverEnd = page.locator('.feed-end');
    this.rail = page.locator('.rail');
    this.joinCard = page.locator('.join-card');
    this.joinCommunity = this.joinCard.getByRole('link', { name: 'Join the community' });
    this.events = page.locator('.rail__events');
    this.rows = this.events.locator('.event-row');
    this.eventsError = this.events.locator('.inline-error');
    this.eventsTryAgain = this.eventsError.getByRole('button', { name: 'Try again' });
    this.mostRead = page.getByRole('heading', { name: 'Most read' });
    this.mostReadRows = page.locator('.ranked > li');
    this.verse = page.locator('.verse__quote');
  }

  async open(search = ''): Promise<void> {
    await this.page.goto(`/${search}`);
  }

  section(name: string): Locator {
    return this.sections.filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** Each section link's name and address, in order. */
  sectionLinks(): Promise<{ name: string; href: string | null }[]> {
    return this.sections.evaluateAll((links) =>
      links.map((link) => ({
        name: link.textContent?.trim() ?? '',
        href: link.getAttribute('href'),
      })),
    );
  }

  /** The stories under `rows` (the lead, the headlines or the river), as drawn. */
  stories(rows: Locator): Promise<LandingStory[]> {
    return rows.evaluateAll((items) =>
      items.map((item) => {
        const text = (selector: string) =>
          item.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
        return {
          href: item.querySelector('.story-link')?.getAttribute('href') ?? null,
          section: text('.story__section'),
          title: text('.story-link'),
          summary: text('.story-lead__dek, .story-row__dek'),
          meta: text('.story__meta'),
          image: item.querySelector('img')?.getAttribute('src') ?? null,
        };
      }),
    );
  }

  /** Each row's date, title, meta and where it leads. */
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

  /** Most read as drawn: each rank, title and address. */
  ranked(): Promise<{ rank: string; title: string; href: string | null }[]> {
    return this.mostReadRows.evaluateAll((items) =>
      items.map((item) => ({
        rank: item.querySelector('.ranked__n')?.textContent?.trim() ?? '',
        title: item.querySelector('.ranked__title')?.textContent?.trim() ?? '',
        href: item.querySelector('a')?.getAttribute('href') ?? null,
      })),
    );
  }

  /** How far the masthead's top edge is from the top of the viewport. */
  mastheadTop(): Promise<number> {
    return this.page.locator('.masthead').evaluate((el) => el.getBoundingClientRect().top);
  }

  async scrollToVerse(): Promise<void> {
    await this.verse.scrollIntoViewIfNeeded();
  }

  /** The left edges of the lead, the first headline, the river and the rail, to tell columns from a stack. */
  columns(): Promise<{ lead: number; headlines: number; river: number; rail: number }> {
    return this.page.evaluate(() => {
      const left = (selector: string) =>
        Math.round(document.querySelector(selector)?.getBoundingClientRect().left ?? -1);
      return {
        lead: left('.story-lead'),
        headlines: left('.headline-list'),
        river: left('.river'),
        rail: left('.rail'),
      };
    });
  }

  /** Whether the page is wider than the viewport. */
  overflowsHorizontally(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
