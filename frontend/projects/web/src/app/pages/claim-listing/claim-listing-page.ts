import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { type ListingClaimDto, LISTING_CLAIMS_SERVICE, SESSION_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  DescriptionList,
  ErrorPage,
  FormPage,
  ListingHead,
  Skeleton,
  SkeletonRegion,
  TagList,
} from '@cf/components';
import { claimHintOf, claimOutcomeOf, claimPreviewViewOf, type ClaimOutcome } from '@cf/domain';
import { HttpListingClaimsService } from '../../services/http-listing-claims.service';

/** Where the claim screen is: checking the link, showing the listing, or an outcome. */
type Phase = 'checking' | 'ready' | ClaimOutcome;

/**
 * The claim screen in the member shell (L2-078 AC5; ADR 0091; mock `docs/mocks/pages/claim-listing/`):
 * skeletons while the link is checked, then the listing as it will appear (`listing-head` in its
 * preview form, about, focus tags and key facts, leaving out what a draft has not got), the line
 * that says who is signed in and when the link expires, and "Publish my listing" and "This isn't
 * me". An unknown link is the app's 404. Words are rendered as text.
 */
@Component({
  selector: 'cf-claim-listing-page',
  imports: [
    Button,
    Container,
    DescriptionList,
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
  private readonly member = signal('');

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
    this.claims
      .get(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.claim.set(claim);
          this.phase.set('ready');
        },
        error: (error: unknown) => this.phase.set(claimOutcomeOf(error)),
      });
  }
}
