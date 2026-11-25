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
  EmptyState,
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
 * answer to be stored (`publishing`), or an outcome. `unchecked` is a read that failed for no
 * reason the screen knows.
 */
type Phase =
  | 'checking'
  | 'unchecked'
  | 'ready'
  | 'publishing'
  | 'published'
  | 'expired'
  | 'claimed'
  | 'not-found';

/**
 * The claim screen in the member shell (L2-078 AC5, AC6, AC10; ADR 0091; mock
 * `docs/mocks/pages/claim-listing/`): skeletons while the link is checked, then the listing as it
 * will appear (`listing-head` in its preview form, about, focus tags and key facts, leaving out what
 * a draft has not got), the line that says who is signed in and when the link expires, and "Publish
 * my listing" and "This isn't me". Publishing reads "Publishing…" with both answers disabled; it
 * ends in "Your listing is live", or an alert above the listing that nothing was published, with
 * both answers back. A used or expired link says so, an unknown one is the app's 404. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-claim-listing-page',
  imports: [
    Alert,
    Button,
    Container,
    DescriptionList,
    Done,
    EmptyState,
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
  protected readonly failed = signal(false);
  /** Where "See your listing" leads once it is published. */
  protected readonly listingHref = signal('');
  private readonly member = signal('');

  protected readonly busy = computed(() => this.phase() === 'publishing');
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

  protected check(): void {
    this.phase.set('checking');
    this.claims
      .get(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.phase.set('ready');
        },
        error: (error: unknown) => {
          const outcome = claimOutcomeOf(error);
          this.phase.set(outcome === 'failed' ? 'unchecked' : outcome);
        },
      });
  }

  protected publish(): void {
    if (this.phase() !== 'ready') return;
    this.phase.set('publishing');
    this.failed.set(false);
    this.claims
      .publish(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.listingHref.set(`/directory/${encodeURIComponent(answer.listingId)}`);
          this.phase.set('published');
        },
        error: (error: unknown) => {
          const outcome = claimOutcomeOf(error);
          if (outcome === 'failed') {
            this.failed.set(true);
            this.phase.set('ready');
          } else this.phase.set(outcome);
        },
      });
  }
}
