import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { type ListingClaimDto, LISTING_CLAIMS_SERVICE, SESSION_SERVICE } from '@cf/api';
import {
  Alert,
  Button,
  Container,
  DescriptionList,
  Done,
  ErrorPage,
  FormPage,
  ListingHead,
  Skeleton,
  SkeletonRegion,
  TagList,
} from '@cf/components';
import { claimHintOf, claimOutcomeOf, claimPreviewViewOf } from '@cf/domain';
import { HttpListingClaimsService } from '../../services/http-listing-claims.service';

/**
 * Where the claim screen is: checking the link, showing the listing (`ready`), waiting for an
 * answer to be stored (`publishing`, `declining`), or an outcome.
 */
type Phase =
  | 'checking'
  | 'ready'
  | 'publishing'
  | 'declining'
  | 'published'
  | 'declined'
  | 'expired'
  | 'claimed'
  | 'not-found';

/**
 * The claim screen in the member shell (L2-078 AC5, AC6, AC10; ADR 0092; mock
 * `docs/mocks/pages/claim-listing/`): skeletons while the link is checked, then the listing as it
 * will appear (`listing-head` in its preview form, about, focus tags and key facts, leaving out what
 * a draft has not got), the line that says who is signed in and when the link expires, and "Publish
 * my listing" and "This isn't me". Publishing reads "Publishing…" with both answers disabled; it
 * ends in "Your listing is live", or an alert above the listing that nothing was published, with
 * both answers back. "This isn't me" is busy the same way and ends in "Thanks for letting us know"
 * (L2-078 AC7), or an alert that nothing changed. A used or expired link says so, an unknown one is
 * the app's 404, and a check that fails the app's server error. Words are rendered as text.
 */
@Component({
  selector: 'cf-claim-listing-page',
  imports: [
    Alert,
    Button,
    Container,
    DescriptionList,
    Done,
    ErrorPage,
    FormPage,
    ListingHead,
    Skeleton,
    SkeletonRegion,
    TagList,
  ],
  templateUrl: './claim-listing-page.html',
  styleUrl: './claim-listing-page.scss',
  providers: [{ provide: LISTING_CLAIMS_SERVICE, useClass: HttpListingClaimsService }],
})
export default class ClaimListingPage {
  private readonly claims = inject(LISTING_CLAIMS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly phase = signal<Phase>('checking');
  protected readonly claim = signal<ListingClaimDto | null>(null);
  /** The last answer that did not go through, until the next is pressed. */
  protected readonly failed = signal<'publish' | 'decline' | null>(null);
  /** Where "See your listing" leads once it is published. */
  protected readonly listingHref = signal('');
  private readonly member = signal('');

  protected readonly publishing = computed(() => this.phase() === 'publishing');
  protected readonly declining = computed(() => this.phase() === 'declining');
  protected readonly busy = computed(() => this.publishing() || this.declining());
  protected readonly listing = computed(() => this.claim()?.listing ?? null);
  protected readonly view = computed(() => {
    const listing = this.listing();
    return listing === null ? null : claimPreviewViewOf(listing);
  });
  protected readonly hint = computed(() => {
    const claim = this.claim();
    return claim === null || this.member() === ''
      ? ''
      : claimHintOf(this.member(), claim.expiresAt);
  });

  constructor() {
    inject(SESSION_SERVICE)
      .current()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (session) => this.member.set(session.name) });
    this.check();
  }

  private check(): void {
    this.phase.set('checking');
    this.claims
      .get(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.phase.set('ready');
        },
        // A 5xx has already opened the app's server-error screen, so the skeletons stay.
        error: (error: unknown) => {
          const outcome = claimOutcomeOf(error);
          if (outcome !== 'failed') this.phase.set(outcome);
        },
      });
  }

  protected publish(): void {
    this.answer('publish');
  }

  protected decline(): void {
    this.answer('decline');
  }

  /** Sends one answer; while it waits neither can be pressed again (L2-078 AC6). */
  private answer(which: 'publish' | 'decline'): void {
    if (this.phase() !== 'ready') return;
    this.phase.set(which === 'publish' ? 'publishing' : 'declining');
    this.failed.set(null);
    (which === 'publish' ? this.claims.publish(this.token) : this.claims.decline(this.token))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.listingHref.set(`/directory/${encodeURIComponent(answer.listingId)}`);
          this.phase.set(which === 'publish' ? 'published' : 'declined');
        },
        error: (error: unknown) => {
          const outcome = claimOutcomeOf(error);
          if (outcome === 'failed') {
            this.failed.set(which);
            this.phase.set('ready');
          } else this.phase.set(outcome);
        },
      });
  }
}
