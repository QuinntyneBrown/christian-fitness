import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ACCOUNT_SERVICE, INTERESTS, type InterestKey } from '@cf/api';
import { Alert, AuthLayout, Button, Interest, InterestList, TextField } from '@cf/components';
import {
  clearFieldError,
  errorSummaryOf,
  joinRefusalOf,
  joinRequestOf,
  toggleInterest,
  validateJoin,
  type JoinField,
  type JoinFieldErrors,
  type JoinRefusal,
} from '@cf/domain';

/**
 * The Join screen (mock docs/mocks/pages/join/): a visitor creates an account and lands on Home,
 * signed in (L2-003 AC1). One signal per field; while the request is on its way the button reads
 * "Creating your profile…" and is disabled, and the fields hold still (L2-003 AC5). Before
 * sending, `validateJoin` names each invalid field and nothing is sent (L2-003 AC3, mock
 * `invalid-fields`); editing a field clears its error. A refusal gives the form back as it was
 * with what `joinRefusalOf` says: a taken email on the email field (L2-003 AC2, mock `invalid`),
 * the generic "Check your details" (L2-032 AC1, mock `refused`) or "We couldn't create your
 * profile" (mock `error`).
 */
@Component({
  selector: 'cf-join-page',
  imports: [Alert, AuthLayout, Button, Interest, InterestList, TextField],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
})
export class JoinPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly options = INTERESTS;
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly homeChurch = signal('');
  protected readonly interests = signal<readonly InterestKey[]>([]);
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<JoinFieldErrors>({});
  protected readonly summary = computed(() => errorSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next submit (or, for a taken email, a new email). */
  protected readonly refusal = signal<JoinRefusal | null>(null);

  /** Keeps what the visitor typed in `field` and clears that field's error. */
  protected edit(field: JoinField, value: string): void {
    this.fields[field].set(value);
    this.fieldErrors.update((errors) => clearFieldError(errors, field));
    if (field === 'email' && this.refusal() === 'email-taken') this.refusal.set(null);
  }

  private readonly fields: Record<JoinField, WritableSignal<string>> = {
    fullName: this.fullName,
    email: this.email,
    password: this.password,
    homeChurch: this.homeChurch,
  };

  protected toggle(key: InterestKey): void {
    this.interests.update((selected) => toggleInterest(selected, key));
  }

  protected submit(): void {
    if (this.submitting()) return;
    const form = {
      fullName: this.fullName(),
      email: this.email(),
      password: this.password(),
      homeChurch: this.homeChurch(),
      interests: this.interests(),
    };
    const errors = validateJoin(form);
    this.fieldErrors.set(errors);
    this.refusal.set(null);
    if (Object.keys(errors).length > 0) return;
    this.submitting.set(true);
    const request = joinRequestOf(form);
    this.account
      .join(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        // The form comes back as it was, so the visitor can try again.
        error: (error: unknown) => {
          this.submitting.set(false);
          this.refusal.set(joinRefusalOf(error));
        },
      });
  }
}
