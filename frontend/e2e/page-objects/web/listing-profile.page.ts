import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from '../shared/error-screen';

/** The head of a listing's profile as the member reads it. */
export interface ListingHeadView {
  /** The mark's initials, or none when it shows a photo. */
  initials: string;
  /** `round` for a Person, Instructor or Ambassador; `square` for the others. */
  shape: 'round' | 'square';
  photo: string | null;
  kind: string;
  /** "Verified" in words, or none. */
  verified: string | null;
  name: string;
  tagline: string;
}

/** A Follow button as the member reads it (L2-056 AC1). */
export interface FollowButtonView {
  /** The visible label. */
  label: string;
  /** Its accessible name, with the listing's name. */
  name: string;
  pressed: string | null;
  /** Whether the check mark shows. */
  check: boolean;
  /** `aria-disabled`, set while its request is in flight (L2-056 AC8). */
  disabled: string | null;
}

/** Reads a Follow button: its label, accessible name, pressed state, check mark and `aria-disabled`. */
export async function readFollow(button: Locator): Promise<FollowButtonView> {
  return button.evaluate((element) => ({
    label: Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim(),
    name: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    pressed: element.getAttribute('aria-pressed'),
    check: element.querySelector('svg.icon') !== null,
    disabled: element.getAttribute('aria-disabled'),
  }));
}

/** One hosting row as the member reads it. */
export interface HostingRowView {
  href: string;
  image: string | null;
  meta: string;
  title: string;
  sub: string;
}

/** One Connected row as the member reads it. */
export interface ConnectionRowView {
  href: string;
  mark: string;
  name: string;
  text: string;
}

/** The website fact as the member reads it. */
export interface WebsiteView {
  text: string;
  href: string;
  target: string | null;
  rel: string | null;
}

/**
 * The member app's listing profile at `/directory/:id` (mock `docs/mocks/pages/listing-profile/`):
 * the back link, the head, Hosting, About, the key facts and Connected, and the loading, error and
 * not-found states. Owns the selectors of that screen; the not-found view is read through
 * {@link ErrorScreen}.
 */
export class WebListingProfilePage extends ErrorScreen {
  readonly backLink: Locator;
  readonly head: Locator;
  readonly messageButton: Locator;
  readonly followButton: Locator;
  /** The danger toasts: each `role="alert"` in the toast region. */
  readonly failureToasts: Locator;
  readonly messageAlert: Locator;
  readonly alsoOffersServices: Locator;
  readonly name: Locator;
  readonly hosting: Locator;
  readonly hostingHeading: Locator;
  readonly hostingRows: Locator;
  readonly hostingEmpty: Locator;
  readonly connected: Locator;
  readonly connectedRows: Locator;
  readonly about: Locator;
  readonly aboutText: Locator;
  readonly focusTags: Locator;
  readonly facts: Locator;
  readonly website: Locator;
  readonly loading: Locator;
  readonly loadingLabel: Locator;
  readonly errorHeading: Locator;
  readonly errorText: Locator;
  readonly retryButton: Locator;
  readonly directoryAction: Locator;

  constructor(page: Page) {
    super(page);
    this.backLink = this.main.getByRole('link', { name: 'Directory', exact: true }).first();
    this.head = this.main.locator('.listing-head');
    this.messageButton = this.head.getByRole('button', { name: 'Message' });
    this.followButton = this.head.locator('button.follow');
    this.failureToasts = page.locator('.toast-region [role="alert"] .toast');
    this.messageAlert = this.main.getByRole('alert');
    this.alsoOffersServices = this.main.getByRole('link', { name: 'Also offers services' });
    this.name = this.head.getByRole('heading', { level: 1 });
    this.hosting = this.main.getByRole('region', { name: /^Hosting/ });
    this.hostingHeading = this.hosting.getByRole('heading', { level: 2 });
    this.hostingRows = this.hosting.locator('a.hosting-row');
    this.hostingEmpty = this.hosting.locator('.hosting__empty');
    this.connected = this.main.getByRole('region', { name: 'Connected' });
    this.connectedRows = this.connected.locator('a.mini-row');
    this.about = this.main.getByRole('region', { name: 'About', exact: true });
    this.aboutText = this.about.locator('.lead');
    this.focusTags = this.about.locator('.tag');
    this.facts = this.main.getByRole('complementary', { name: 'About this listing' }).locator('dl');
    this.website = this.facts.getByRole('link');
    this.loading = this.main.locator('[aria-busy="true"]');
    this.loadingLabel = this.main.getByText('Loading listing', { exact: true }).first();
    this.errorHeading = this.main.getByRole('heading', { name: "This listing didn't load" });
    this.errorText = this.main.locator('.empty-state__text');
    this.retryButton = this.main.getByRole('button', { name: 'Try again' });
    this.directoryAction = this.main.locator('.empty-state__actions').getByRole('link', {
      name: 'Directory',
    });
  }

  async open(id: string): Promise<void> {
    await this.page.goto(`/directory/${id}`);
  }

  /** Reads the head once the listing has loaded (its skeleton head has no name). */
  async headView(): Promise<ListingHeadView> {
    await this.head.locator('.listing-head__name').waitFor();
    return this.head.evaluate((head) => {
      const text = (selector: string): string =>
        (head.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
      const mark = head.querySelector('.listing-mark');
      const verified = head.querySelector('.listing-head__verified');
      const kind = head.querySelector('.listing-head__kind');
      return {
        initials: mark?.tagName === 'IMG' ? '' : (mark?.textContent ?? '').trim(),
        shape: mark?.classList.contains('listing-mark--person') ? 'round' : 'square',
        photo: mark?.tagName === 'IMG' ? mark.getAttribute('src') : null,
        kind: (kind?.firstChild?.textContent ?? '').trim(),
        verified: verified ? (verified.textContent ?? '').replace(/[·\s]+/g, ' ').trim() : null,
        name: text('h1'),
        tagline: text('.subtitle'),
      };
    });
  }

  /** The head's Follow button. */
  async followView(): Promise<FollowButtonView> {
    return readFollow(this.followButton);
  }

  /**
   * Presses Follow from the keyboard. Playwright's click waits while a control is `aria-disabled`,
   * so a press during a request in flight is made by focus and key, as a keyboard user makes it.
   */
  async pressFollowByKey(key: 'Enter' | ' ' = 'Enter'): Promise<void> {
    await this.followButton.focus();
    await this.page.keyboard.press(key === ' ' ? 'Space' : key);
  }

  /** Each danger toast's title and text, in order. */
  async failureToastViews(): Promise<[string, string][]> {
    return this.failureToasts.evaluateAll((toasts) =>
      toasts.map((toast) => [
        (toast.querySelector('.toast__title')?.textContent ?? '').trim(),
        (toast.querySelector('.toast__text')?.textContent ?? '').trim(),
      ]),
    );
  }

  /** The facts' follower count, as the member reads it. */
  async followers(): Promise<string> {
    return (await this.factViews()).find(([term]) => term === 'Followers')?.[1] ?? '';
  }

  /** Each hosting row, in order. */
  async hostingViews(): Promise<HostingRowView[]> {
    return this.hostingRows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string): string =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        return {
          href: row.getAttribute('href') ?? '',
          image: row.querySelector('img.hosting-row__image')?.getAttribute('src') ?? null,
          meta: text('.hosting-row__meta'),
          title: text('.hosting-row__title'),
          sub: text('.hosting-row__sub'),
        };
      }),
    );
  }

  /** Each Connected row, in order: its address, its mark (a photo's address or the initials), name and line. */
  async connectionViews(): Promise<ConnectionRowView[]> {
    return this.connectedRows.evaluateAll((rows) =>
      rows.map((row) => {
        const text = (selector: string): string =>
          (row.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
        const photo = row.querySelector('img.listing-mark');
        return {
          href: row.getAttribute('href') ?? '',
          mark: photo ? (photo.getAttribute('src') ?? '') : text('.listing-mark'),
          name: text('.mini-row__name'),
          text: text('.mini-row__text'),
        };
      }),
    );
  }

  /** Each key fact, term to value, in order. */
  async factViews(): Promise<[string, string][]> {
    return this.facts.evaluate((list) =>
      Array.from(list.querySelectorAll(':scope > div')).map((pair) => [
        (pair.querySelector('dt')?.textContent ?? '').trim(),
        (pair.querySelector('dd')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ]),
    );
  }

  async websiteView(): Promise<WebsiteView> {
    return {
      text: ((await this.website.textContent()) ?? '').replace(/\s+/g, ' ').trim(),
      href: (await this.website.getAttribute('href')) ?? '',
      target: await this.website.getAttribute('target'),
      rel: await this.website.getAttribute('rel'),
    };
  }
}
