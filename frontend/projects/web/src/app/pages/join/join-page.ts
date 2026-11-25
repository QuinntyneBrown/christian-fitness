import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpAccountService } from '../../services/http-account.service';
import { ACCOUNT_SERVICE, INTERESTS, type InterestKey } from '@cf/api';
import {
  Alert,
  AuthLayout,
  Button,
  Interest,
  InterestList,
  Checkbox,
  Link,
  TextField,
} from '@cf/components';
import {
  AGE_ERROR,
  clearFieldError,
  errorSummaryOf,
  joinRefusalOf,
  joinRequestOf,
  signInReturnPathOf,
  toggleInterest,
  validateJoin,
  type JoinField,
  type JoinFieldErrors,
  type JoinRefusal,
} from '@cf/domain';

/**
 * The Join screen (mock docs/mocks/pages/join/): a visitor creates an account and lands on Home,
 * signed in (L2-003 AC1), or on the `returnUrl` inside the app it was opened with (ADR 0091). One signal per field; while the request is on its way the button reads
 * "Creating your profile…" and is disabled, and the fields hold still (L2-003 AC5). Before
 * sending, `validateJoin` names each invalid field and nothing is sent (L2-003 AC3, mock
 * `invalid-fields`); editing a field clears its error. A refusal gives the form back as it was
 * with what `joinRefusalOf` says: a taken email on the email field (L2-003 AC2, mock `invalid`),
 * the generic "Check your details" (L2-032 AC1, mock `refused`) or "We couldn't create your
 * profile" (mock `error`).
 */
@Component({
  selector: 'cf-join-page',
  imports: [Alert, AuthLayout, Button, Interest, InterestList, Checkbox, Link, TextField],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
  providers: [{ provide: ACCOUNT_SERVICE, useClass: HttpAccountService }],
})
export default class JoinPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** Where to land once joined: a `returnUrl` inside the app, such as a claim link, else Home (ADR 0091). */
  private readonly returnPath = signInReturnPathOf(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'),
  );

  protected readonly options = INTERESTS;
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly homeChurch = signal('');
  protected readonly interests = signal<readonly InterestKey[]>([]);
  protected readonly ageConfirmed = signal(false);
  protected confirmAge(value: boolean) {
    this.ageConfirmed.set(value);
    this.fieldErrors.update((errors) => clearFieldError(errors, 'ageConfirmed'));
  }
  protected readonly submitting = signal(false);
  protected readonly fieldErrors = signal<JoinFieldErrors>({});
  protected readonly summary = computed(() => errorSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next submit (or, for a taken email, a new email). */
  protected readonly refusal = signal<JoinRefusal | null>(null);

  /** Keeps what the visitor typed in `field` and clears that field's error. */
  protected edit(field: Exclude<JoinField, 'ageConfirmed'>, value: string): void {
    this.fields[field].set(value);
    this.fieldErrors.update((errors) => clearFieldError(errors, field));
    if (field === 'email' && this.refusal() === 'email-taken') this.refusal.set(null);
  }

  private readonly fields: Record<Exclude<JoinField, 'ageConfirmed'>, WritableSignal<string>> = {
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
      ageConfirmed: this.ageConfirmed(),
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
        next: () => void this.router.navigateByUrl(this.returnPath),
        // The form comes back as it was, so the visitor can try again.
        error: (error: unknown) => {
          this.submitting.set(false);
          const refusal = joinRefusalOf(error);
          if (refusal === 'age-unconfirmed') {
            this.ageConfirmed.set(false);
            this.fieldErrors.set({ ageConfirmed: AGE_ERROR });
          } else this.refusal.set(refusal);
        },
      });
  }
}
