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
  /** Said in place of Message when the member takes messages only from their groups (L2-065 AC5). */
  readonly messagesNote: Locator;
  readonly error: Locator;
  readonly errorTitle: Locator;
  /** The visitor's masthead (L2-005 AC4; mock `profile/public`), with Sign in and Join free. */
  readonly masthead: Locator;
  readonly mastheadSignIn: Locator;
  readonly mastheadJoin: Locator;
  /** The member app's header, which only a signed-in member has. */
  readonly memberHeader: Locator;
  /** A visitor's action under the name, in place of Message (L2-005 AC4). */
  readonly joinToMessage: Locator;
  /** The not-found view, shown at the profile's address when it may not be seen (L2-065 AC2). */
  readonly notFound: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.avatar = this.main.locator('.profile-hero .avatar');
    this.facts = this.main.locator('.profile-hero__facts > span');
    this.bio = this.main.locator('.prose');
    this.tags = this.main.locator('.tag-list .tag');
    this.sectionHeadings = this.main.getByRole('heading', { level: 2 });
    this.messageLink = this.main.getByRole('link', { name: 'Message', exact: true });
    this.messagesNote = this.main.locator('.member-profile__restricted');
    this.error = this.main.locator('.error-state');
    this.errorTitle = this.error.getByRole('heading', { level: 2 });
    this.masthead = page.locator('.masthead');
    this.mastheadSignIn = this.masthead.getByRole('link', { name: 'Sign in' });
    this.mastheadJoin = this.masthead.getByRole('link', { name: 'Join free' });
    this.memberHeader = page.locator('.app-header');
    this.joinToMessage = this.main.getByRole('link', { name: 'Join to message' });
    this.notFound = this.main.locator('.empty-state--system').getByRole('heading', { level: 1 });
  }

  async open(memberId: string): Promise<void> {
    await this.page.goto(`/members/${memberId}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }
}
