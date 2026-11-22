import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { AuthLayout, Button, FormAlert, TextField } from '@cf/components';
import { signInRefusalOf, type SignInRefusal } from '@cf/domain';

/**
 * The Sign in screen (mock docs/mocks/pages/sign-in/): a member signs in with their email and
 * password and lands on Home (L2-004 AC1). One signal per field; while the request is on its way
 * the button reads "Signing in…" and is disabled, and the fields hold still. A refusal shows one
 * generic alert that names neither field (L2-004 AC2), and the form stays as typed. The mock's "Forgot
 * your password?" link waits for the screen it opens (journey 20, ADR 0009).
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [AuthLayout, Button, FormAlert, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export class SignInPage {
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);
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
        next: () => void this.router.navigateByUrl('/home'),
        // The form comes back as it was, so the member can try again.
        error: (error: unknown) => {
          this.refusal.set(signInRefusalOf(error));
          this.submitting.set(false);
        },
      });
  }
}
