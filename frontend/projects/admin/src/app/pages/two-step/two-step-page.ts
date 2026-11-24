import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Button, StaffLayout, TextField } from '@cf/components';
import { twoStepRefusalOf } from '@cf/domain';

/** What the field says for each refusal that keeps staff on this screen (mock `invalid`, `failed`). */
const FIELD_ERRORS = {
  'invalid-code':
    "That code doesn't match. Codes change every 30 seconds, so enter the newest one.",
  failed: "We couldn't check your code. Try again in a moment.",
} as const;

/**
 * The code screen, "Enter your code" (mock docs/mocks/pages/admin-two-step/; L2-046 AC1 to AC5,
 * AC7; ADR 0013): after the password, staff enter the 6-digit code from their authenticator app and
 * land on the Dashboard. While the code is checked the button reads "Verifying…" and is disabled,
 * and the field holds still. A wrong code or a failure is said under the field, which keeps the
 * code and takes focus; an expired or locked pending sign-in goes back to Staff sign in with a
 * navigation state that says which (`twoStepRefusalOf`).
 */
@Component({
  selector: 'cf-two-step-page',
  imports: [Button, StaffLayout, TextField],
  templateUrl: './two-step-page.html',
  styleUrl: './two-step-page.scss',
})
export default class TwoStepPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

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
        error: (error: unknown) => {
          const refusal = twoStepRefusalOf(error);
          if (refusal === 'expired' || refusal === 'locked') {
            void this.router.navigateByUrl('/sign-in', { state: { twoStep: refusal } });
            return;
          }
          this.error.set(FIELD_ERRORS[refusal]);
          this.submitting.set(false);
          // A DOM lookup, not a view query (slice 30.1): the field is already on screen.
          this.host.nativeElement.querySelector<HTMLInputElement>('#f-code')?.focus();
        },
      });
  }
}
