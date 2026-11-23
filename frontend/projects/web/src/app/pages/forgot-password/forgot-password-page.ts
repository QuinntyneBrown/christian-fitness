import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ACCOUNT_SERVICE } from '@cf/api';
import { AuthLayout, Button, FormAlert, TextField } from '@cf/components';
import { EMAIL_INVALID, emailErrorOf, resetRequestRefusalOf } from '@cf/domain';

/**
 * The Forgot password screen (mock docs/mocks/pages/forgot-password/): a member asks for a reset
 * link by email (L2-044; ADR 0010). A blank or malformed email is named on the field and in a
 * summary that takes focus, and nothing is sent (AC5, mock `invalid`); editing the field clears
 * it. While the request is on its way the button reads "Sending…" and the field holds still (AC7,
 * mock `submitting`). Once accepted, the form gives way to "Check your email", naming the email
 * as typed, whatever the API knows of it (AC3, AC4, mock `success`); "send it again" sends it once
 * more. A failure keeps the email and says the email could not be sent (AC7, mock `error`); too
 * many requests from the network say so and keep it too (L2-034 AC3, mock `limited`).
 */
@Component({
  selector: 'cf-forgot-password-page',
  imports: [AuthLayout, Button, FormAlert, TextField],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.scss',
})
export class ForgotPasswordPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly email = signal('');
  protected readonly emailError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);
  protected readonly limited = signal(false);
  /** The email the link went to, as typed; `null` while the form shows. */
  protected readonly sentTo = signal<string | null>(null);
  protected readonly summary = computed(() => {
    const text = this.emailError();
    return text ? [{ text, target: 'f-email' }] : [];
  });

  protected edit(value: string): void {
    this.email.set(value);
    this.emailError.set(null);
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.failed.set(false);
    this.limited.set(false);
    const error = emailErrorOf(this.email());
    this.emailError.set(error);
    if (error) return;

    this.submitting.set(true);
    const email = this.email();
    this.account
      .requestPasswordReset({ email })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sentTo.set(email);
        },
        // The form comes back as it was, so the member can try again.
        error: (failure: unknown) => {
          this.submitting.set(false);
          const refusal = resetRequestRefusalOf(failure);
          if (refusal === 'invalid') this.emailError.set(EMAIL_INVALID);
          else if (refusal === 'rate-limited') this.limited.set(true);
          else this.failed.set(true);
        },
      });
  }

  /** "send it again": the form returns with the same email and sends it at once. */
  protected sendAgain(): void {
    this.sentTo.set(null);
    this.submit();
  }
}
