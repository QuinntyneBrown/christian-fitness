import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Button, FormAlert, StaffLayout, TextField } from '@cf/components';
import { staffSignInRefusalOf, type StaffSignInRefusal } from '@cf/domain';

/**
 * The Staff sign in screen (mock docs/mocks/pages/admin-sign-in/): staff sign in with their work
 * email and password and land on the Dashboard (L2-018 AC1). One signal per field; while the
 * request is on its way the button reads "Signing in…" and is disabled, and the fields hold still.
 * A refusal shows one alert: wrong credentials name neither field (AC3), a member is told the
 * console is for the team (AC2), and anything else is a failure; the form stays as typed. The
 * mock's "Two-step verification required" note waits for slice 9.2 (ADR 0011).
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [Button, FormAlert, StaffLayout, TextField],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
})
export class SignInPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitting = signal(false);
  protected readonly refusal = signal<StaffSignInRefusal | null>(null);

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.refusal.set(null);
    this.session
      .signIn({ email: this.email(), password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        // The form comes back as it was, so staff can try again.
        error: (error: unknown) => {
          this.refusal.set(staffSignInRefusalOf(error));
          this.submitting.set(false);
        },
      });
  }
}
