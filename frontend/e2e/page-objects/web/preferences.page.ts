import type { Locator, Page } from '@playwright/test';

/**
 * The member app's Preferences (mock `docs/mocks/pages/preferences/`): the head, the section list,
 * the Email and Notifications sections with their switches, the save bar, and the loading and error
 * states. Owns the selectors of that screen.
 */
export class PreferencesPage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly backLink: Locator;
  readonly sectionNav: Locator;
  readonly sectionLinks: Locator;
  readonly email: Locator;
  readonly emailSummary: Locator;
  readonly turnOffAllEmail: Locator;
  readonly notifications: Locator;
  readonly privacy: Locator;
  readonly visibility: Locator;
  readonly suggestions: Locator;
  readonly area: Locator;
  readonly interests: Locator;
  readonly switches: Locator;
  readonly saveBar: Locator;
  readonly saveBarText: Locator;
  readonly saveButton: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly tryAgainButton: Locator;
  readonly backToProfile: Locator;
  readonly tabBar: Locator;
  /** The header's bell, which moves inside the app. */
  readonly bell: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.subtitle = this.main.locator('.subtitle');
    this.backLink = this.main.getByRole('link', { name: 'Profile', exact: true });
    this.sectionNav = this.main.getByRole('navigation', { name: 'Preference sections' });
    this.sectionLinks = this.sectionNav.getByRole('link');
    this.email = this.main.getByRole('region', { name: 'Email' });
    this.emailSummary = this.email.locator('.pref__sub');
    this.turnOffAllEmail = this.email.getByRole('button', { name: 'Turn off all email' });
    this.notifications = this.main.getByRole('region', { name: 'Notifications' });
    this.privacy = this.main.getByRole('region', { name: 'Privacy' });
    this.visibility = this.privacy.getByRole('group', { name: 'Who can see your profile' });
    this.suggestions = this.main.getByRole('region', { name: 'Suggestions' });
    this.area = this.suggestions.getByRole('combobox', { name: 'Your area' });
    this.interests = this.suggestions.locator('.interest');
    this.switches = this.main.getByRole('switch');
    this.saveBar = page.locator('.save-bar');
    this.saveBarText = this.saveBar.locator('.save-bar__text');
    this.saveButton = this.saveBar.getByRole('button');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.skeletons = this.loading.locator('.skeleton');
    this.error = this.main.locator('.error-state');
    this.tryAgainButton = this.error.getByRole('button', { name: 'Try again' });
    this.backToProfile = this.error.getByRole('link', { name: 'Back to profile' });
    this.tabBar = page.locator('.tab-bar');
    this.bell = page.getByRole('banner').getByRole('link', { name: /^Notifications/ });
  }

  async open(): Promise<void> {
    await this.page.goto('/preferences');
  }

  path(): string {
    return new URL(this.page.url()).pathname;
  }

  visibilityChoice(name: string): Locator {
    return this.visibility.getByRole('radio', { name: new RegExp(`^${name}`) });
  }

  interest(name: string): Locator {
    return this.suggestions.getByRole('button', { name, exact: true });
  }

  /** Each interest: its name, whether it is pressed, and whether it carries a check mark. */
  interestValues(): Promise<[string, boolean, boolean][]> {
    return this.interests.evaluateAll((toggles) =>
      toggles.map((t) => [
        t.textContent?.trim() ?? '',
        t.getAttribute('aria-pressed') === 'true',
        t.querySelector('svg') !== null,
      ]),
    );
  }

  switch(name: string): Locator {
    return this.main.getByRole('switch', { name });
  }

  /** Each switch of a section: its name and whether it is on. */
  switchValues(section: Locator): Promise<[string, boolean][]> {
    return section
      .locator('.switch')
      .evaluateAll((rows) =>
        rows.map((row) => [
          row.querySelector('.switch__label')?.textContent?.trim() ?? '',
          (row.querySelector('input') as HTMLInputElement).checked,
        ]),
      );
  }

  /** Each switch's description, by its name. */
  descriptions(section: Locator): Promise<string[]> {
    return section.locator('.switch__desc').allTextContents();
  }

  /** The smallest touch target among the switches' rows, in pixels. */
  smallestSwitchTarget(): Promise<number> {
    return this.main
      .locator('.switch')
      .evaluateAll((rows) =>
        Math.min(
          ...rows.map((row) =>
            Math.min(row.getBoundingClientRect().height, row.getBoundingClientRect().width),
          ),
        ),
      );
  }

  /** Whether the save bar ends above where the tab bar starts. */
  async saveBarClearsTabBar(): Promise<boolean> {
    const bar = await this.saveBar.locator('.save-bar__inner').boundingBox();
    const tabs = await this.tabBar.boundingBox();
    return bar !== null && tabs !== null && bar.y + bar.height <= tabs.y;
  }
}
