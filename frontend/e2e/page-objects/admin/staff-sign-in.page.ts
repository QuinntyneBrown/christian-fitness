import type { Locator, Page } from '@playwright/test';

/**
 * The admin app's Staff sign in screen (mock `docs/mocks/pages/admin-sign-in/`): the `staff` card
 * with one "Sign in with Google" button, a sign-in notice (`sso-notice`) for a refused account and
 * a form alert for anything else. Owns the selectors of that screen.
 */
export class AdminStaffSignInPage {
  readonly main: Locator;
  readonly card: Locator;
  readonly brandName: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  /** The domain named in the lead, in `strong`. */
  readonly leadDomain: Locator;
  /** Every text input on the card: there must be none (L2-018 AC1). */
  readonly inputs: Locator;
  /** The one Google button. */
  readonly googleButton: Locator;
  /** Every button on the card. */
  readonly buttons: Locator;
  /** The `form-alert` above the button: Google didn't finish, not set up, too many, suspended, expired. */
  readonly alert: Locator;
  readonly alertTitle: Locator;
  readonly alertText: Locator;
  /** The sign-in notice for a refused Google account (wrong domain, no console role). */
  readonly notice: Locator;
  readonly noticeTitle: Locator;
  readonly noticeAccount: Locator;
  readonly noticeText: Locator;
  /** The note under the button. */
  readonly note: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.card = this.main.locator('.staff__card');
    this.brandName = this.card.locator('.staff__name');
    this.heading = this.card.getByRole('heading', { level: 1 });
    this.lead = this.card.locator('.staff__lead');
    this.leadDomain = this.lead.locator('strong');
    this.inputs = this.card.locator('input');
    this.googleButton = this.card.locator('.staff__sso .google-button');
    this.buttons = this.card.getByRole('button');
    this.alert = this.card.locator('.auth__alert .form-alert');
    this.alertTitle = this.alert.locator('.form-alert__title');
    this.alertText = this.alert.locator('.form-alert__text');
    this.notice = this.card.locator('.sso-notice');
    this.noticeTitle = this.notice.locator('.sso-notice__title');
    this.noticeAccount = this.notice.locator('.sso-notice__account');
    this.noticeText = this.notice.locator('.sso-notice__text');
    this.note = this.card.locator('.staff__note');
  }

  async open(): Promise<void> {
    await this.page.goto('/sign-in');
  }

  /** Opens Staff sign in as Google sends staff back: `returned` to finish, `failed` when it didn't. */
  async returnFromGoogle(outcome: 'returned' | 'failed'): Promise<void> {
    await this.page.goto(`/sign-in?google=${outcome}`);
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The path and query the address bar shows. */
  location(): string {
    const url = new URL(this.page.url());
    return url.pathname + url.search;
  }

  async chooseGoogle(): Promise<void> {
    await this.googleButton.click();
  }

  /** Presses the Google button with the keyboard alone: Tab until it has focus, then Enter. */
  async chooseGoogleByKeyboard(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('Tab');
      if (await this.googleButton.evaluate((button) => button === document.activeElement)) break;
    }
    await this.page.keyboard.press('Enter');
  }
}
