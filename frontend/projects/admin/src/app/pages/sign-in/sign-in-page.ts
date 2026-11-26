import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Alert, GoogleButton, SsoNotice, StaffLayout } from '@cf/components';
import {
  googleReturnOf,
  sessionEndingOf,
  staffSignInRefusalOf,
  type SessionEnding,
  type StaffSignInRefusal,
} from '@cf/domain';

/** What Staff sign in shows: a refusal, or how the last session ended (ADR 0016, ADR 0100). */
type SignInMessage = StaffSignInRefusal | { kind: 'session-ended'; ending: SessionEnding };

/**
 * The Staff sign in screen (mock docs/mocks/pages/admin-sign-in/): the `staff` card with one "Sign
 * in with Google" button and no field (L2-018 AC1; ADR 0100). The button starts the sign-in and
 * leaves for Google in a full-page redirect, reading "Opening Google…" until the page unloads.
 * Google sends staff back with `?google=returned`, read once and dropped from the address: the
 * screen finishes the sign-in and opens the Dashboard; `?google=failed` says it didn't finish. A
 * Google account from outside the team's domain, or one with no console role, shows the sign-in
 * notice with that account and "Try another Google account", which asks Google for its chooser
 * (L2-018 AC2, AC10). Anything else shows one form alert. Sent here by
 * `sessionExpiredInterceptor`, it says the session ended while idle or after 12 hours.
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [Alert, GoogleButton, SsoNotice, StaffLayout],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export default class SignInPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly message = signal<SignInMessage | null>(this.endingMessage());
  /** How the last session ended, when that is the message. */
  protected readonly ending = computed(() => {
    const message = this.message();
    return message?.kind === 'session-ended' ? message.ending : null;
  });
  /** The Google account the notice names, when the last sign-in refused one. */
  protected readonly refusedAccount = computed(() => {
    const message = this.message();
    return message && 'account' in message ? message.account : null;
  });
  /** On the way to Google, or finishing on the way back: the button stays busy. */
  protected readonly leaving = signal(false);

  constructor() {
    const returned = googleReturnOf(this.route.snapshot.queryParamMap.get('google'));
    if (!returned) return;
    // Read once: a reload or Back neither finishes again nor repeats the message.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { google: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (returned === 'failed') this.message.set({ kind: 'failed' });
    else this.finish();
  }

  /** Starts Google sign-in; after a refused account, Google shows its account chooser. */
  protected signInWithGoogle(): void {
    if (this.leaving()) return;
    const selectAccount = this.refusedAccount() !== null;
    this.leaving.set(true);
    this.message.set(null);
    this.session
      .startGoogle({ selectAccount })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ location }) => this.document.location.assign(location),
        error: (error: unknown) => {
          this.leaving.set(false);
          this.message.set(staffSignInRefusalOf(error));
        },
      });
  }

  private finish(): void {
    this.leaving.set(true);
    this.session
      .completeGoogle()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (error: unknown) => {
          this.leaving.set(false);
          this.message.set(staffSignInRefusalOf(error));
        },
      });
  }

  /** How the last session ended, from the navigation that opened this screen; none on a visit. */
  private endingMessage(): SignInMessage | null {
    const navigation = this.router.currentNavigation();
    // Only the app's own navigation counts: a reload or Back restores the state, not the reason.
    if (navigation?.trigger !== 'imperative' || !navigation.previousNavigation) return null;
    const ending = sessionEndingOf(navigation.extras.state);
    return ending ? { kind: 'session-ended', ending } : null;
  }
}
