import type { Locator, Page } from '@playwright/test';

/** One directory row as the member reads it. */
export interface ListingRowView {
  /** The row's link, or none while the listing profile does not exist (ADR 0082). */
  href: string | null;
  /** The mark's initials, or none when it shows a photo. */
  initials: string;
  /** `round` for a Person, Instructor or Ambassador; `square` for the others. */
  shape: 'round' | 'square';
  photo: string | null;
  name: string;
  verified: boolean;
  tagline: string;
  area: string;
  hosting: string;
  /** Whether the hosting count carries the accent of "<n> hosting". */
  hostingSome: boolean;
}

/** One kind's group as the member reads it. */
export interface DirectoryGroupView {
  heading: string | null;
  blurb: string | null;
  names: string[];
}

/** One kind chip as the member reads it. */
export interface KindChipView {
  label: string;
  count: string;
  href: string;
  current: boolean;
}

/**
 * The member app's Directory at `/directory` (mock `docs/mocks/pages/directory/`): its heading,
 * search, kind chips, the groups of listing rows and the loading, empty, no-results, error and
 * paging states. Owns the selectors of that screen.
 */
export class WebDirectoryPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly search: Locator;
  readonly chipBar: Locator;
  readonly chips: Locator;
  readonly groups: Locator;
  readonly rows: Locator;
  readonly followButtons: Locator;
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly skeletonRows: Locator;
  readonly emptyHeading: Locator;
  readonly emptyText: Locator;
  readonly browseEventsLink: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  readonly noResultsHeading: Locator;
  readonly noResultsText: Locator;
  readonly clearSearch: Locator;
  /** "Know someone who belongs here? Suggest a listing" under the heading (L2-062 AC1). */
  readonly suggestLink: Locator;
  /** "Suggest a listing" in the no-results state. */
  readonly noResultsSuggest: Locator;
  readonly loadingMore: Locator;
  readonly moreError: Locator;
  readonly moreRetry: Locator;
  readonly cappedNote: Locator;
  /** The header's navigation: its links and the one that is current. */
  readonly navLinks: Locator;
  readonly currentNavLink: Locator;
  /** The bottom bar below MD: its items and the one that is current. */
  readonly mobileItems: Locator;
  readonly mobileCurrentItem: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.search = this.main.getByRole('searchbox', { name: 'Search the directory' });
    this.chipBar = this.main.getByRole('navigation', { name: 'Filter the directory by kind' });
    this.chips = this.chipBar.getByRole('link');
    this.groups = this.main.locator('section.directory-group');
    this.rows = this.main.locator('.listing-row:not(:has(.skeleton))');
    this.followButtons = this.main.locator('button.follow');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.loadingLabel = this.main.getByText('Loading the directory', { exact: true });
    this.skeletonRows = this.main.locator('.listing-row:has(.skeleton)');
    this.emptyHeading = this.main.getByRole('heading', { name: 'No listings yet' });
    this.emptyText = this.main.locator('.empty-state__text');
    this.browseEventsLink = this.main.getByRole('link', { name: 'Browse events' });
    this.errorHeading = this.main.getByRole('heading', { name: "The directory didn't load" });
    this.retryButton = this.main.getByRole('button', { name: 'Try again' });
    this.noResultsHeading = this.main.getByText('No one by that name yet', { exact: true });
    this.noResultsText = this.main.locator('.empty-state__text');
    this.clearSearch = this.main.getByRole('button', { name: 'Clear search' });
    this.suggestLink = this.main.locator('.page-head').getByRole('link', {
      name: 'Know someone who belongs here? Suggest a listing',
    });
    this.noResultsSuggest = this.main
      .locator('.empty-state__actions')
      .getByRole('link', { name: 'Suggest a listing', exact: true });
    this.loadingMore = this.main.getByText('Loading more listings…', { exact: true });
    this.moreError = this.main.getByText("More listings didn't load.", { exact: true });
    this.moreRetry = this.main.locator('.feed-end').getByRole('button', { name: 'Try again' });
    this.cappedNote = this.main.getByText('Showing the first 200. Narrow your search.', {
      exact: true,
    });
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    this.navLinks = nav.getByRole('link');
    this.currentNavLink = nav.locator('[aria-current="page"]');
    const tabs = page.getByRole('navigation', { name: 'Primary, mobile' });
    this.mobileItems = tabs.getByRole('link');
    this.mobileCurrentItem = tabs.locator('[aria-current="page"]');
  }

  async open(query = ''): Promise<void> {
    await this.page.goto(`/directory${query}`);
  }

  chip(label: string): Locator {
    return this.chipBar.getByRole('link', { name: new RegExp(`^${label}\\b`) });
  }

  async chooseKind(label: string): Promise<void> {
    await this.chip(label).click();
  }

  async typeSearch(text: string): Promise<void> {
    await this.search.fill(text);
  }

  /** Types one key at a time, as a member does. */
  async pressSearch(text: string): Promise<void> {
    await this.search.pressSequentially(text);
  }

  /** Scrolls the end of the list into view, which asks for the next page. */
  async reachEnd(): Promise<void> {
    await this.main.locator('.feed-end').last().scrollIntoViewIfNeeded();
  }

  /** Reads the chips, in order. */
  async chipViews(): Promise<KindChipView[]> {
    return this.chips.evaluateAll((chips) =>
      chips.map((chip) => {
        const count = (chip.querySelector('.chip__count')?.textContent ?? '').trim();
        return {
          label: (chip.textContent ?? '').replace(count, '').replace(/\s+/g, ' ').trim(),
          count,
          href: chip.getAttribute('href') ?? '',
          current: chip.getAttribute('aria-current') === 'page',
        };
      }),
    );
  }

  /** Reads each group: its heading and blurb (none when one kind is chosen) and its rows' names. */
  async groupViews(): Promise<DirectoryGroupView[]> {
    return this.groups.evaluateAll((groups) =>
      groups.map((group) => ({
        heading: group.querySelector('h2')?.textContent?.trim() ?? null,
        blurb: group.querySelector('.directory-group__blurb')?.textContent?.trim() ?? null,
        names: Array.from(group.querySelectorAll('.listing-row__name > span:first-child')).map(
          (name) => (name.textContent ?? '').trim(),
        ),
      })),
    );
  }

  /** Reads every row, in order. */
  async rowViews(): Promise<ListingRowView[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string): string =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const link = row.querySelector('.listing-row__link');
        const mark = row.querySelector('.listing-mark');
        const hosting = row.querySelector('.listing-row__hosting');
        return {
          href: link?.tagName === 'A' ? link.getAttribute('href') : null,
          initials: mark?.tagName === 'IMG' ? '' : (mark?.textContent ?? '').trim(),
          shape: mark?.classList.contains('listing-mark--person') ? 'round' : 'square',
          photo: mark?.tagName === 'IMG' ? mark.getAttribute('src') : null,
          name: text('.listing-row__name > span:first-child'),
          verified: row.querySelector('.verified-mark[role="img"][aria-label="Verified"]') !== null,
          tagline: text('.listing-row__tagline'),
          area: text('.listing-row__area--col'),
          hosting: text('.listing-row__hosting'),
          hostingSome: hosting?.classList.contains('listing-row__hosting--some') ?? false,
        };
      }),
    );
  }

  /** The visible area of each row: the column from MD up, the line under the tagline below it. */
  async visibleAreaPlacement(): Promise<('column' | 'under-tagline')[]> {
    return this.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const inline = row.querySelector<HTMLElement>('.listing-row__area--inline');
        return inline && getComputedStyle(inline).display !== 'none' ? 'under-tagline' : 'column';
      }),
    );
  }

  /**
   * Whether the page itself scrolls sideways, and whether the chip bar does. The app header fits a
   * small phone again (ADR 0084), so the whole page is judged.
   */
  async sidewaysScroll(): Promise<{ page: boolean; chips: boolean }> {
    const page = await this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    const chips = await this.chipBar.evaluate((bar) => {
      const scroller = bar.querySelector('.chip-bar') ?? bar;
      return scroller.scrollWidth > scroller.clientWidth;
    });
    return { page, chips };
  }
}
