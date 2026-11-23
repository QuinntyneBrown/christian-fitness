import { Location } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { ACCOUNT_SERVICE } from '@cf/api';
import { AuthLayout, Button, FormAlert, TextField } from '@cf/components';
import {
  newPasswordErrorsOf,
  newPasswordSummaryOf,
  resetPasswordRefusalOf,
  resetTokenOf,
  type NewPasswordErrors,
  type NewPasswordField,
} from '@cf/domain';

/** Which shape the screen has: one of the mock's notices, or the form. */
type ResetState = 'checking' | 'form' | 'saved' | 'expired' | 'unchecked';

/**
 * The Reset password screen (mock docs/mocks/pages/reset-password/) the emailed link opens (L2-045;
 * ADR 0012). It reads the token once from the link's fragment, keeps it here and takes it out of
 * the address bar (AC1). With no token the link is expired at once (AC4); otherwise "Checking your
 * link…" shows until the API names the account (mock `loading`, `default`). A short or mismatched
 * password is named on its field and in a summary that takes focus, and nothing is sent (AC5, mock
 * `invalid`). While saving, the button reads "Saving…" and the fields hold still (AC6, mock
 * `submitting`). A save gives way to "Password saved" (AC3, mock `success`); an expired link to
 * "This link has expired" (AC4, mock `error`); a failed save keeps both fields (AC6, mock
 * `failed`); a failed check offers "Try again" (AC6, mock `unchecked`).
 */
@Component({
  selector: 'cf-reset-password-page',
  imports: [AuthLayout, Button, FormAlert, TextField],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
})
export class ResetPasswordPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  /** Read once: the fragment never reaches a server, and leaves the address bar now. */
  private readonly token = resetTokenOf(inject(ActivatedRoute).snapshot.fragment);

  protected readonly state = signal<ResetState>(this.token ? 'checking' : 'expired');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly errors = signal<NewPasswordErrors>({});
  protected readonly submitting = signal(false);
  protected readonly failed = signal(false);
  protected readonly summary = computed(() => newPasswordSummaryOf(this.errors()));

  constructor() {
    inject(Location).replaceState('/reset-password');
    this.check();
  }

  protected edit(field: NewPasswordField, value: string): void {
    (field === 'password' ? this.password : this.confirm).set(value);
    const errors = { ...this.errors() };
    delete errors[field];
    this.errors.set(errors);
  }

  protected submit(): void {
    if (this.submitting() || !this.token) return;
    this.failed.set(false);
    const errors = newPasswordErrorsOf(this.password(), this.confirm());
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) return;

    this.submitting.set(true);
    this.account
      .completePasswordReset({ token: this.token, password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.state.set('saved');
        },
        // The form comes back as it was, so the member can try again.
        error: (failure: unknown) => {
          this.submitting.set(false);
          const refusal = resetPasswordRefusalOf(failure);
          if (refusal === 'expired') this.state.set('expired');
          // The API refused the password's length: the field says so as the form's own check does.
          else if (refusal === 'invalid') this.errors.set(newPasswordErrorsOf('', ''));
          else this.failed.set(true);
        },
      });
  }

  /** "Try again" after a failed check: the kept token is checked once more. */
  protected check(): void {
    if (!this.token) return;
    this.state.set('checking');
    this.account
      .checkPasswordReset({ token: this.token })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ email }) => {
          this.email.set(email);
          this.state.set('form');
        },
        error: (failure: unknown) =>
          this.state.set(resetPasswordRefusalOf(failure) === 'expired' ? 'expired' : 'unchecked'),
      });
  }
}
