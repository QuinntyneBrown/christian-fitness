import type { Locator, Page } from '@playwright/test';

/**
 * The member app's view of another member at `/members/:id` (mock `docs/mocks/pages/profile/member.html`):
 * the `profile-hero`, About and Into. Owns the selectors of that screen.
 */
export class WebMemberProfilePage {
  readonly main: Locator;
  readonly heading: Locator;
  readonly avatar: Locator;
  /** The home church and city under the name; only a church its owner shows appears. */
  readonly facts: Locator;
  readonly bio: Locator;
  readonly tags: Locator;
  /** Every section heading on the screen, in order. */
  readonly sectionHeadings: Locator;
  /** The Message action under the name (slice 14.1): it opens the direct conversation. */
  readonly messageLink: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.avatar = this.main.locator('.profile-hero .avatar');
    this.facts = this.main.locator('.profile-hero__facts > span');
    this.bio = this.main.locator('.prose');
    this.tags = this.main.locator('.tag-list .tag');
    this.sectionHeadings = this.main.getByRole('heading', { level: 2 });
    this.messageLink = this.main.getByRole('link', { name: 'Message' });
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.getByRole('heading', { level: 2 });
  }

  async open(memberId: string): Promise<void> {
    await this.page.goto(`/members/${memberId}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }
}
