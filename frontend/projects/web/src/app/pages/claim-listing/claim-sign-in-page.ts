import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LISTING_CLAIMS_SERVICE } from '@cf/api';
import { AuthLayout, Button, Container, ErrorPage } from '@cf/components';
import { claimExpiryText, claimOutcomeOf, type ClaimOutcome } from '@cf/domain';
import { HttpListingClaimsService } from '../../services/http-listing-claims.service';

/** Where the signed-out claim page is: checking the link, naming its listing, or an outcome. */
type Phase = 'checking' | 'ready' | ClaimOutcome;

/**
 * The claim link opened signed out (L2-078 AC4; ADR 0091; mocks `claim-listing/signed-out`,
 * `signed-out-expired`, `signed-out-claimed`). Matched only for a visitor (`signedOutGuard`); it
 * names the listing and offers Sign in and Join, both with `returnUrl` back to the link, and shows
 * nothing else of the listing. An expired or used link says so; an unknown one is the app's 404.
 * The listing's name is rendered as text.
 */
@Component({
  selector: 'cf-claim-sign-in-page',
  imports: [AuthLayout, Button, Container, ErrorPage],
  templateUrl: './claim-sign-in-page.html',
  styleUrl: './claim-sign-in-page.scss',
  providers: [{ provide: LISTING_CLAIMS_SERVICE, useClass: HttpListingClaimsService }],
})
export default class ClaimSignInPage {
  private readonly claims = inject(LISTING_CLAIMS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly phase = signal<Phase>('checking');
  protected readonly heading = signal('');
  protected readonly note = signal('');
  private readonly back = `returnUrl=${encodeURIComponent(`/claim/${this.token}`)}`;
  protected readonly signInHref = `/sign-in?${this.back}`;
  protected readonly joinHref = `/join?${this.back}`;

  constructor() {
    this.check();
  }

  protected check(): void {
    this.phase.set('checking');
    this.claims
      .get(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (claim) => {
          this.heading.set(`Claim ${claim.name}`);
          this.note.set(`This link works once and expires on ${claimExpiryText(claim.expiresAt)}.`);
          this.phase.set('ready');
        },
        error: (error: unknown) => this.phase.set(claimOutcomeOf(error)),
      });
  }
}
