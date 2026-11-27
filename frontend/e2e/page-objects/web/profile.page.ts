import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Profile at `/profile` (mock `docs/mocks/pages/profile/`): the `profile-hero`, the
 * About, "Goals this year" and Into sections, and the "Going to" aside, with the loading and error
 * states. Owns the selectors of that screen.
 */
export class WebProfilePage {
  readonly main: Locator;
  /** The `profile-hero` block: avatar, name, facts and Edit profile. */
  readonly hero: Locator;
  readonly heading: Locator;
  readonly avatar: Locator;
  readonly meta: Locator;
  /** The home church and city under the name, each with its icon. */
  readonly facts: Locator;
  readonly aboutHeading: Locator;
  readonly bio: Locator;
  readonly goalsHeading: Locator;
  readonly goals: Locator;
  readonly intoHeading: Locator;
  readonly tags: Locator;
  /** Each section's `empty-inline` sentence, in the order the page shows them. */
  readonly emptyTexts: Locator;
  readonly going: Locator;
  readonly goingHeading: Locator;
  /** One link per event in "Going to". */
  readonly goingItems: Locator;
  /** The "Cancelled" badge of each event staff cancelled. */
  readonly cancelledBadges: Locator;
  readonly goingEmpty: Locator;
  readonly browseEventsLink: Locator;
  /** The skeletons while the profile loads. */
  readonly loading: Locator;
  /** The visually hidden heading of the loading state. */
  readonly loadingHeading: Locator;
  readonly skeletons: Locator;
  /** The hero's Edit profile button. */
  readonly editButton: Locator;
  /** Preferences, beside Edit profile (L2-005 AC1, L2-064 AC1). */
  readonly preferencesLink: Locator;
  /** The empty About section's "Add a bio". */
  readonly addBioButton: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  readonly errorText: Locator;
  readonly tryAgainButton: Locator;
  readonly backHomeLink: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.hero = this.main.locator('.profile-hero');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.avatar = this.main.locator('.profile-hero .avatar');
    this.meta = this.main.locator('.profile-hero__meta');
    this.facts = this.main.locator('.profile-hero__facts > span');
    this.aboutHeading = this.main.getByRole('heading', { level: 2, name: 'About' });
    this.bio = this.main.locator('.prose');
    this.goalsHeading = this.main.getByRole('heading', { level: 2, name: 'Goals this year' });
    this.goals = this.main.locator('.goals > li');
    this.intoHeading = this.main.getByRole('heading', { level: 2, name: 'Into' });
    this.tags = this.main.locator('.tag-list .tag');
    this.emptyTexts = this.main.locator('.empty-inline__text');
    this.going = this.main.getByRole('region', { name: 'Going to' });
    this.goingHeading = this.going.getByRole('heading', { level: 2 });
    this.goingItems = this.going.locator('.going-item');
    this.cancelledBadges = this.going.locator('.going-item .status--cancelled');
    this.goingEmpty = this.going.locator('.empty-inline');
    this.browseEventsLink = this.going.getByRole('link', { name: 'Browse events' });
    this.loading = this.main.locator('[aria-busy="true"]');
    this.loadingHeading = this.loading.getByRole('heading', { level: 1, name: 'Loading profile' });
    this.skeletons = this.loading.locator('.skeleton');
    this.editButton = this.main
      .locator('.profile-hero__action')
      .getByRole('button', { name: 'Edit profile' });
    this.preferencesLink = this.main
      .locator('.profile-hero__action')
      .getByRole('link', { name: 'Preferences' });
    this.addBioButton = this.main
      .locator('.empty-inline')
      .getByRole('button', { name: 'Add a bio' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.getByRole('heading', { level: 2 });
    this.errorText = this.error.locator('.empty-state__text');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.backHomeLink = this.error.getByRole('link', { name: 'Back to home' });
  }

  async open(): Promise<void> {
    await this.page.goto('/profile');
  }

  /** The date and title of each event in "Going to", as the member reads them. */
  async goingRows(): Promise<{ date: string; title: string; href: string | null }[]> {
    return this.goingItems.evaluateAll((items) =>
      items.map((item) => ({
        date: item.querySelector('.going-item__date')?.textContent?.trim() ?? '',
        title: item.querySelector('.mini-row__name')?.textContent?.trim() ?? '',
        href: item.getAttribute('href'),
      })),
    );
  }

  /** Whether each event in "Going to" shows a picture. */
  async goingImages(): Promise<boolean[]> {
    return this.goingItems.evaluateAll((items) =>
      items.map((item) => item.querySelector('img.going-item__image') !== null),
    );
  }

  /** The images on the screen whose `src` attribute is `src`. */
  images(src: string): Locator {
    return this.main.locator(`img[src="${src}"]`);
  }

  /** Chooses Try again and waits until the API has answered the profile again. */
  async tryAgainAndAwaitAnswer(): Promise<void> {
    const answered = this.page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/profile/me',
    );
    await this.tryAgainButton.click();
    await answered;
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }
}
