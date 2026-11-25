import type { Locator, Page } from '@playwright/test';

/** One suggested event as its row reads. */
export interface HomeEventRow {
  href: string | null;
  month: string;
  day: string;
  title: string;
  meta: string;
  end: string;
}

/** One conversation row in Home's Messages aside. */
export interface HomeMessageRow {
  href: string | null;
  name: string;
  time: string;
  text: string;
  unread: string | null;
}

/**
 * The member app's Home at `/home` (mock `docs/mocks/pages/home/`): the greeting, the next-event
 * card or the invitation to browse Events, the suggested events, the Messages aside, and the
 * loading, partial and error states. Owns the selectors of that screen.
 */
export class WebHomePage {
  readonly main: Locator;
  readonly greeting: Locator;
  /** The next-event card and its parts. */
  readonly nextEvent: Locator;
  readonly nextPill: Locator;
  readonly nextWhen: Locator;
  readonly nextTitle: Locator;
  readonly nextPlace: Locator;
  readonly nextImage: Locator;
  readonly detailsLink: Locator;
  readonly groupChatLink: Locator;
  /** The invitation shown with no registered event. */
  readonly invitation: Locator;
  readonly invitationHeading: Locator;
  readonly browseEventsLink: Locator;
  /** The suggested events. */
  readonly suggestedHeading: Locator;
  readonly allEventsLink: Locator;
  readonly suggestedRows: Locator;
  /** Home's Messages aside, its empty and partial states, and the navigation unread counts. */
  readonly messagesSection: Locator;
  readonly messagesHeading: Locator;
  readonly openMessagesLink: Locator;
  readonly messageRows: Locator;
  readonly messagesEmpty: Locator;
  readonly messagesErrorHeading: Locator;
  readonly messagesErrorText: Locator;
  readonly messagesRetryButton: Locator;
  readonly headerMessagesLink: Locator;
  readonly headerUnreadBadge: Locator;
  readonly mobileNav: Locator;
  readonly mobileItems: Locator;
  readonly mobileCurrentItem: Locator;
  readonly mobileMessagesLink: Locator;
  /** Loading skeletons, the load error and its Try again. */
  readonly loading: Locator;
  readonly errorHeading: Locator;
  readonly retryButton: Locator;

  footerLink(name: string) {
    return this.page.getByRole('contentinfo').getByRole('link', { name, exact: true });
  }

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');
    this.greeting = this.main.locator('.page-title--greeting');
    this.nextEvent = this.main.locator('.next-event');
    this.nextPill = this.nextEvent.locator('.next-event__pill');
    this.nextWhen = this.nextEvent.locator('.next-event__when');
    this.nextTitle = this.nextEvent.locator('.next-event__title');
    this.nextPlace = this.nextEvent.locator('.place');
    this.nextImage = this.nextEvent.locator('.next-event__image');
    this.detailsLink = this.nextEvent.getByRole('link', { name: 'Details', exact: true });
    this.groupChatLink = this.nextEvent.getByRole('link', { name: 'Group chat' });
    this.invitation = this.main.locator('.empty-card');
    this.invitationHeading = this.invitation.getByRole('heading', { name: 'No events yet' });
    this.browseEventsLink = this.invitation.getByRole('link', { name: 'Browse events' });
    this.suggestedHeading = this.main.getByRole('heading', { name: 'Coming up' });
    this.allEventsLink = this.main.getByRole('link', { name: 'All events' });
    this.suggestedRows = this.main.locator('.event-row');
    this.messagesSection = this.main.getByRole('region', { name: 'Messages' });
    this.messagesHeading = this.messagesSection.getByRole('heading', { name: 'Messages' });
    this.openMessagesLink = this.messagesSection.getByRole('link', { name: 'Open' });
    this.messageRows = this.messagesSection.locator('.mini-row');
    this.messagesEmpty = this.messagesSection.locator('.empty-inline__text');
    this.messagesErrorHeading = this.messagesSection.locator('.inline-error__title');
    this.messagesErrorText = this.messagesSection.locator('.inline-error__body p').nth(1);
    this.messagesRetryButton = this.messagesSection.getByRole('button', { name: 'Try again' });
    const primaryNav = page.getByRole('navigation', { name: 'Primary', exact: true });
    this.headerMessagesLink = primaryNav.getByRole('link', { name: /^Messages/ });
    this.headerUnreadBadge = this.headerMessagesLink.locator('.count-badge');
    this.mobileNav = page.getByRole('navigation', { name: 'Primary, mobile' });
    this.mobileItems = this.mobileNav.getByRole('link');
    this.mobileCurrentItem = this.mobileNav.locator('[aria-current="page"]');
    this.mobileMessagesLink = this.mobileNav.getByRole('link', { name: /^Messages/ });
    this.loading = this.main.locator('[aria-busy="true"]');
    this.errorHeading = this.main.getByRole('heading', { name: "Your home page didn't load" });
    this.retryButton = this.main.getByRole('button', { name: 'Try again' });
  }

  /** Opens Home, with `query` (such as `?welcome=back`) when given. */
  async open(query = ''): Promise<void> {
    await this.page.goto('/home' + query);
  }

  /** Waits until the API has answered the session the greeting is read from. */
  async sessionAnswered(): Promise<void> {
    await this.page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/session',
    );
  }

  /** Each suggested event's row, in order. */
  async rows(): Promise<HomeEventRow[]> {
    return this.suggestedRows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string) => row.querySelector(selector)?.textContent?.trim() ?? '';
        return {
          href: row.getAttribute('href'),
          month: text('.event-row__month'),
          day: text('.event-row__day'),
          title: text('.event-row__title'),
          meta: text('.event-row__meta'),
          end: text('.event-row__end'),
        };
      }),
    );
  }

  /** Each conversation row in Home's Messages aside, in order. */
  async messageItems(): Promise<HomeMessageRow[]> {
    return this.messageRows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string) => row.querySelector(selector)?.textContent?.trim() ?? '';
        return {
          href: row.getAttribute('href'),
          name: text('.mini-row__name'),
          time: text('.mini-row__time'),
          text: text('.mini-row__text'),
          unread: row.querySelector('.unread-dot')?.getAttribute('aria-label') ?? null,
        };
      }),
    );
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
