import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/**
 * The member app's Event series at `/events/series/:id` (mock `docs/mocks/pages/event-series/`):
 * the back link, the wide banner, the eyebrow, title, facts and summary, and the aside with the
 * sign-up panel and the "Hosted by" card. Owns the selectors of that screen. An unknown series
 * shows the not-found screen, read through {@link ErrorScreen}.
 */
export class WebEventSeriesPage extends ErrorScreen {
  readonly backLink: Locator;
  readonly banner: Locator;
  readonly eyebrow: Locator;
  readonly seriesTitle: Locator;
  /** Each fact: its term (`dt`) and detail (`dd`). */
  readonly facts: Locator;
  readonly summary: Locator;
  readonly sessionsHeading: Locator;
  /** "<done> done · <to go> to go" beside the Sessions heading. */
  readonly sessionsNote: Locator;
  /** The ordered list of dates. */
  readonly sessionList: Locator;
  readonly sessions: Locator;
  /** The column that holds the head and the sessions. */
  readonly content: Locator;
  /** The aside that holds the sign-up panel and the host card. */
  readonly aside: Locator;
  /** The sign-up panel: "Sign up", the spots, the ways to come and the note, or the confirmation. */
  readonly panel: Locator;
  readonly panelTitle: Locator;
  readonly spots: Locator;
  readonly plans: Locator;
  readonly panelNote: Locator;
  readonly confirmed: Locator;
  /** The ways to come as one radio group, "How would you like to come?" (ADR 0099). */
  readonly planGroup: Locator;
  readonly everySession: Locator;
  readonly dropIn: Locator;
  /** The panel's one button: "Join the series", "Joining…" or "Pick a date first". */
  readonly panelButton: Locator;
  /**
   * The notes under the confirmation: "Pay the host at your first session, …" for a paid series,
   * then which dates already booked keep the drop-in price.
   */
  readonly payNotes: Locator;
  readonly progressLabel: Locator;
  /** "Attendance not recorded yet", or "Came to <attended> of <recorded>". */
  readonly progressCount: Locator;
  readonly allDatesButton: Locator;
  readonly groupChatLink: Locator;
  readonly leaveButton: Locator;
  /** The generic failure above the button. */
  readonly failure: Locator;
  readonly hostCard: Locator;
  readonly hostLabel: Locator;
  readonly hostName: Locator;
  readonly hostVerified: Locator;
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;
  readonly allEventsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = page.locator('.back-link');
    this.banner = page.locator('.banner-image');
    this.eyebrow = page.locator('.eyebrow');
    this.seriesTitle = page.getByRole('heading', { level: 1 });
    this.facts = page.locator('.facts__item');
    this.summary = page.locator('.series-summary');
    this.sessionsHeading = page.getByRole('heading', { level: 2, name: 'Sessions' });
    this.sessionsNote = page.locator('.section-head__note');
    this.sessionList = page.locator('ol.session-list');
    this.sessions = this.sessionList.locator('.session-row');
    this.content = page.locator('.event-series__content');
    this.aside = page.getByRole('complementary', { name: 'Sign up' });
    this.panel = this.aside.locator('.series-panel');
    this.panelTitle = this.panel.getByRole('heading', { level: 2 });
    this.spots = this.panel.locator('.register__spots');
    this.plans = this.panel.locator('.plan-option');
    this.panelNote = this.panel.locator('.register__note');
    this.confirmed = this.panel.getByRole('status');
    this.planGroup = this.panel.getByRole('group', { name: 'How would you like to come?' });
    this.everySession = this.planGroup.getByRole('radio', { name: /^Every session/ });
    this.dropIn = this.planGroup.getByRole('radio', { name: /^Pick dates to drop in/ });
    this.panelButton = this.panel.locator('.register__state').getByRole('button');
    this.payNotes = this.panel.locator('.register__note--start');
    this.progressLabel = this.panel.locator('.series-progress__label');
    this.progressCount = this.panel.locator('.series-progress__count');
    this.allDatesButton = this.panel.getByRole('button', { name: 'All dates' });
    this.groupChatLink = this.panel.getByRole('link', { name: 'Group chat' });
    this.leaveButton = this.panel.getByRole('button', { name: 'Leave the series' });
    this.failure = this.panel.getByRole('alert');
    this.hostCard = this.aside.locator('a.host-card');
    this.hostLabel = this.hostCard.locator('.host-card__label');
    this.hostName = this.hostCard.locator('.host-card__name');
    this.hostVerified = this.hostCard.getByRole('img', { name: 'Verified' });
    this.loading = page.locator('[aria-busy="true"]');
    this.errorHeading = page.getByRole('heading', { name: "This series didn't load" });
    this.retryButton = page.getByRole('button', { name: 'Try again' });
    this.allEventsButton = page.locator('.empty-state__actions').getByRole('link', {
      name: 'All events',
    });
  }

  /** The row of session `n` (1-based, in date order). */
  session(n: number): Locator {
    return this.sessions.nth(n - 1);
  }

  /** What a row says: its meta (with the hidden date), topic and end. */
  sessionMeta(n: number): Locator {
    return this.session(n).locator('.session-row__meta');
  }

  sessionTopic(n: number): Locator {
    return this.session(n).locator('.session-row__topic');
  }

  sessionEnd(n: number): Locator {
    return this.session(n).locator('.session-row__end');
  }

  /** The "Details" link of session `n`, named "Details of session <n>". */
  details(n: number): Locator {
    return this.session(n).getByRole('link', { name: `Details of session ${n}` });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/events/series/${id}`);
  }
}
