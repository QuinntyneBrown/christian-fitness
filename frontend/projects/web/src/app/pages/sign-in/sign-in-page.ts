import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SESSION_SERVICE, type ApiError } from '@cf/api';
import {
  Alert,
  Button,
  Divider,
  GoogleButton,
  Link,
  SignInLayout,
  SsoNotice,
  TextField,
} from '@cf/components';
import {
  googleRefusalOf,
  googleReturnOf,
  signInRefusalOf,
  signInReturnPathOf,
  type GoogleRefusal,
  type SignInRefusal,
} from '@cf/domain';

/**
 * The Sign in screen (mock docs/mocks/pages/sign-in/): the `signin` card with "Continue with Google"
 * first (L2-004 AC7; ADR 0099), which leaves for Google in a full-page redirect, above "or with
 * email" and the email form. A member signs in with their email and
 * password and lands on the route the guard recorded, or Home (L2-004 AC1, AC6). One signal per
 * field; while the request is on its way the button reads "Signing in…" and is disabled, and the
 * fields hold still. Each refusal shows one alert that names neither field (L2-004 AC2 to AC4), the
 * form stays as typed and the button enabled (ADR 0009, ADR 0012). "Forgot your password?" under
 * the password field opens the Forgot password screen (L2-044 AC1). Back from Google with
 * `google=returned`, the screen finishes the sign-in once and lands on the kept route, or Home
 * (L2-004 AC8, L2-049 AC6); until the answer comes it stays as it is (ADR 0099). A Google attempt
 * that is refused or doesn't finish says so in the alert (L2-004 AC10, AC11, L2-049 AC5, AC11),
 * and the `google` marker leaves the address, so a reload repeats neither. A Google account with
 * no profile (`no_account`) shows the notice naming it in place of the Google button, with
 * "Create my profile" and "Use another account", which asks Google for its account chooser
 * (L2-004 AC9, L2-049 AC13).
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [Alert, Button, Divider, GoogleButton, Link, SignInLayout, SsoNotice, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export default class SignInPage {
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  /** The return address as the guard set it; the API checks it again (L2-049 AC6). */
  private readonly route = inject(ActivatedRoute);
  private readonly query = this.route.snapshot.queryParamMap;
  private readonly returnUrl = this.query.get('returnUrl');
  /** Read once: every arrival on the screen creates it anew (slice 30.1). */
  private readonly returnPath = signInReturnPathOf(this.returnUrl);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<SignInRefusal | GoogleRefusal | null>(null);
  /** On the way to Google: the button stays busy until the page unloads. */
  protected readonly leaving = signal(false);
  /** The Google account that has no profile, named in the notice; none until refused `no_account`. */
  protected readonly noAccount = signal<string | null>(null);
  /** Finishing what Google returned: a second start waits for the answer. */
  private readonly finishing = signal(false);

  constructor() {
    const google = googleReturnOf(this.query.get('google'));
    if (this.query.has('google')) this.dropGoogleMarker();
    if (google === 'returned') this.finishGoogle();
    else if (google === 'failed') this.refusal.set('google-failed');
  }

  /** Replaces the address without `google`, keeping the return address. */
  private dropGoogleMarker(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { google: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Finishes the Google sign-in the API's callback kept (L2-004 AC8). */
  private finishGoogle(): void {
    this.finishing.set(true);
    this.session
      .completeGoogle()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnPath),
        error: (error: unknown) => {
          this.finishing.set(false);
          const refusal = googleRefusalOf(error);
          const account = (error as ApiError).account;
          if (refusal === 'google-no-account' && account) this.noAccount.set(account);
          else this.refusal.set(refusal === 'google-no-account' ? 'google-failed' : refusal);
        },
      });
  }

  /**
   * Starts Google sign-in and leaves for Google in a full-page redirect (L2-004 AC7, L2-049 AC9);
   * `selectAccount` asks Google for its account chooser ("Use another account", L2-049 AC13).
   */
  protected continueWithGoogle(selectAccount = false): void {
    if (this.leaving() || this.finishing()) return;
    this.leaving.set(true);
    this.refusal.set(null);
    this.session
      .startGoogle({
        intent: 'sign-in',
        returnUrl: this.returnUrl,
        ...(selectAccount ? { selectAccount } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ location }) => this.document.location.assign(location),
        error: (error: unknown) => {
          this.leaving.set(false);
          this.refusal.set(googleRefusalOf(error));
        },
      });
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.refusal.set(null);
    this.session
      .signIn({ email: this.email(), password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl(this.returnPath),
        // The form comes back as it was, so the member can try again.
        error: (error: unknown) => {
          this.refusal.set(signInRefusalOf(error));
          this.submitting.set(false);
        },
      });
  }
}
