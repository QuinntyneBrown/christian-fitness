import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { Alert, AuthLayout, Button, Link, TextField } from '@cf/components';
import { signInRefusalOf, signInReturnPathOf, type SignInRefusal } from '@cf/domain';

/**
 * The Sign in screen (mock docs/mocks/pages/sign-in/): a member signs in with their email and
 * password and lands on the route the guard recorded, or Home (L2-004 AC1, AC6). One signal per
 * field; while the request is on its way the button reads "Signing in…" and is disabled, and the
 * fields hold still. Each refusal shows one alert that names neither field (L2-004 AC2 to AC4), the
 * form stays as typed and the button enabled (ADR 0009, ADR 0012). "Forgot your password?" under
 * the password field opens the Forgot password screen (L2-044 AC1).
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [Alert, AuthLayout, Button, Link, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export default class SignInPage {
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);
  /** Read once: every arrival on the screen creates it anew (slice 30.1). */
  private readonly returnPath = signInReturnPathOf(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'),
  );
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<SignInRefusal | null>(null);

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
