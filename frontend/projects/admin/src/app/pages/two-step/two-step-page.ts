import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Button, StaffLayout, TextField } from '@cf/components';

/**
 * The code screen, "Enter your code" (mock docs/mocks/pages/admin-two-step/; L2-046 AC1, AC2;
 * ADR 0012): after the password, staff enter the 6-digit code from their authenticator app and
 * land on the Dashboard. While the code is checked the button reads "Verifying…" and is disabled,
 * and the field holds still.
 */
@Component({
  selector: 'cf-two-step-page',
  imports: [Button, StaffLayout, TextField],
  templateUrl: './two-step-page.html',
  styleUrl: './two-step-page.scss',
})
export class TwoStepPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly code = signal('');
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.session
      .verify({ code: this.code() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: () => {
          this.error.set("We couldn't check your code. Try again in a moment.");
          this.submitting.set(false);
        },
      });
  }
}
