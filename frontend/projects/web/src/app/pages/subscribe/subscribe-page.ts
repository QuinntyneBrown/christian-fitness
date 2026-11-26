import { DOCUMENT, Location } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CLIPBOARD_SERVICE, FEEDS_SERVICE, NEWSLETTER_SERVICE } from '@cf/api';
import {
  FeedList,
  type FeedListItem,
  Footer,
  Masthead,
  SkipLink,
  Subscribe,
  type SubscribeAlert,
  type SubscribeView,
} from '@cf/components';
import {
  CopiedFlag,
  feedlyUrl,
  firstIssueText,
  fragmentTokenOf,
  isExpiredLink,
  storiesPerWeekText,
  SUBSCRIBE_EMAIL_INVALID,
  subscribeEmailErrorOf,
  subscribeRefusalOf,
} from '@cf/domain';
import { HttpFeedsService, HttpNewsletterService } from '../../services/http-newsletter.service';
import { NavigatorClipboard } from '../../services/navigator-clipboard';

/**
 * Subscribe (mocks docs/mocks/pages/subscribe/; L2-057, L2-058, L2-060 AC4; ADR 0110): a public
 * page outside the member shell, under the plain masthead. It opens with the email the landing
 * page's newsletter box handed over in navigation state. An emailed link opens it with one token
 * in the fragment, `#confirm=` or `#unsubscribe=`, which leaves the address bar before the API is
 * asked; `#rss` moves focus to the feeds. The feeds load on their own: a failure shows none.
 */
@Component({
  selector: 'cf-subscribe-page',
  imports: [FeedList, Footer, Masthead, SkipLink, Subscribe],
  providers: [
    { provide: NEWSLETTER_SERVICE, useClass: HttpNewsletterService },
    { provide: FEEDS_SERVICE, useClass: HttpFeedsService },
    { provide: CLIPBOARD_SERVICE, useClass: NavigatorClipboard },
  ],
  templateUrl: './subscribe-page.html',
  styleUrl: './subscribe-page.scss',
})
export default class SubscribePage {
  private readonly newsletter = inject(NEWSLETTER_SERVICE);
  private readonly clipboard = inject(CLIPBOARD_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly copiedFlag = new CopiedFlag();
  private readonly lastCopied = signal<string | null>(null);

  protected readonly view = signal<SubscribeView>('form');
  protected readonly email = signal<string | null>('');
  protected readonly error = signal<string | null>(null);
  protected readonly alert = signal<SubscribeAlert | null>(null);
  protected readonly busy = signal(false);
  protected readonly firstIssue = signal('Saturday at 7 AM');
  protected readonly feeds = signal<readonly FeedListItem[]>([]);
  protected readonly copiedUrl = computed(() =>
    this.copiedFlag.copied() ? this.lastCopied() : null,
  );
  /** The feed whose address is shown selected after the clipboard refused; none until then. */
  protected readonly selectedUrl = signal<string | null>(null);

  constructor() {
    const location = inject(Location);
    const fragment = inject(ActivatedRoute).snapshot.fragment;
    const handed = (location.getState() as { email?: unknown } | null)?.email;
    if (typeof handed === 'string') this.email.set(handed);
    const link = fragmentTokenOf(fragment);
    if (link) {
      // The token leaves the address bar, and so the history, before it is sent (L2-058 AC7).
      location.replaceState('/subscribe');
      this.follow(link.kind, link.token);
    } else if (fragment === 'rss') {
      afterNextRender(() => {
        const heading = this.document.getElementById('rss-title');
        heading?.scrollIntoView?.();
        heading?.focus();
      });
    }
    inject(FEEDS_SERVICE)
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (feeds) =>
          this.feeds.set(
            feeds.map((feed) => ({
              name: feed.name,
              url: feed.url,
              count: storiesPerWeekText(feed.storiesPerWeek),
              feedlyHref: feedlyUrl(feed.url),
              isAll: feed.isAll,
            })),
          ),
        error: () => this.feeds.set([]),
      });
    this.destroyRef.onDestroy(() => this.copiedFlag.dispose());
  }

  /** Typing clears the field's error (L2-057 AC3). */
  protected edit(email: string): void {
    this.email.set(email);
    this.error.set(null);
  }

  /** Sends a valid address, or marks the field (L2-057 AC3, AC4, AC6, AC7). */
  protected submit(email: string): void {
    if (this.busy()) return;
    this.alert.set(null);
    const error = subscribeEmailErrorOf(email);
    this.error.set(error);
    if (error) return;
    const address = email.trim();
    this.busy.set(true);
    this.newsletter
      .subscribe({ email: address })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.email.set(address);
          this.view.set('sent');
        },
        error: (failure: unknown) => {
          this.busy.set(false);
          const refusal = subscribeRefusalOf(failure);
          if (refusal === 'invalid') this.error.set(SUBSCRIBE_EMAIL_INVALID);
          else this.alert.set(refusal);
        },
      });
  }

  /** "Use a different email": the form again, empty. */
  protected differentEmail(): void {
    this.email.set('');
    this.showForm();
  }

  /** "Subscribe again": the form again, with the address that left. */
  protected subscribeAgain(): void {
    this.email.set(this.email() ?? '');
    this.showForm();
  }

  /** Copies a feed's address; a refused clipboard shows it selected (L2-060 AC4). */
  protected async copy(url: string): Promise<void> {
    if (await this.clipboard.write(url)) {
      this.selectedUrl.set(null);
      this.lastCopied.set(url);
      this.copiedFlag.raise();
    } else {
      this.selectedUrl.set(url);
    }
  }

  private showForm(): void {
    this.error.set(null);
    this.alert.set(null);
    this.view.set('form');
  }

  /** Follows an emailed confirmation or Unsubscribe link (L2-058 AC2, AC3, AC5). */
  private follow(kind: 'confirm' | 'unsubscribe', token: string): void {
    this.view.set('checking');
    const failed = (failure: unknown) => {
      this.email.set('');
      this.alert.set(kind === 'confirm' && isExpiredLink(failure) ? 'expired' : 'failed');
      this.view.set('form');
    };
    if (kind === 'confirm') {
      this.newsletter
        .confirm(token)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (confirmed) => {
            this.email.set(confirmed.email);
            this.firstIssue.set(firstIssueText(confirmed.firstIssueAt));
            this.view.set('confirmed');
          },
          error: failed,
        });
    } else {
      this.newsletter
        .unsubscribe(token)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (left) => {
            this.email.set(left.email);
            this.view.set('unsubscribed');
          },
          error: failed,
        });
    }
  }
}
