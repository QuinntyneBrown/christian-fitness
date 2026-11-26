import { DOCUMENT } from '@angular/common';
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
import { ACCOUNT_SERVICE, INTERESTS, SESSION_SERVICE, type InterestKey } from '@cf/api';
import {
  Alert,
  AuthLayout,
  Button,
  Interest,
  InterestList,
  Checkbox,
  Divider,
  GoogleButton,
  Link,
  TextField,
} from '@cf/components';
import {
  AGE_ERROR,
  clearFieldError,
  errorSummaryOf,
  googleRefusalOf,
  googleReturnOf,
  joinRefusalOf,
  joinRequestOf,
  signInReturnPathOf,
  toggleInterest,
  validateJoin,
  type JoinField,
  type JoinFieldErrors,
  type GoogleRefusal,
  type JoinRefusal,
} from '@cf/domain';

/**
 * The Join screen (mock docs/mocks/pages/join/): a visitor creates an account and lands on Home,
 * signed in (L2-003 AC1), or on the `returnUrl` inside the app it was opened with (ADR 0092). One signal per field; while the request is on its way the button reads
 * "Creating your profile…" and is disabled, and the fields hold still (L2-003 AC5). Before
 * sending, `validateJoin` names each invalid field and nothing is sent (L2-003 AC3, mock
 * `invalid-fields`); editing a field clears its error. A refusal gives the form back as it was
 * with what `joinRefusalOf` says: a taken email on the email field (L2-003 AC2, mock `invalid`),
 * the generic "Check your details" (L2-032 AC1, mock `refused`) or "We couldn't create your
 * profile" (mock `error`). "Sign up with Google" comes first, above "or with email", and leaves for
 * Google in a full-page redirect (L2-003 AC7; ADR 0099). Back from a Google attempt that didn't
 * finish, or refused at its start, the alert says so (L2-003 AC11, L2-049 AC5, AC7) and the
 * `google` marker leaves the address.
 */
@Component({
  selector: 'cf-join-page',
  imports: [
    Alert,
    AuthLayout,
    Button,
    Interest,
    InterestList,
    Checkbox,
    Divider,
    GoogleButton,
    Link,
    TextField,
  ],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
  providers: [{ provide: ACCOUNT_SERVICE, useClass: HttpAccountService }],
})
export default class JoinPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly session = inject(SESSION_SERVICE);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** Where to land once joined: a `returnUrl` inside the app, such as a claim link, else Home (ADR 0092). */
  private readonly route = inject(ActivatedRoute);
  private readonly returnPath = signInReturnPathOf(
    this.route.snapshot.queryParamMap.get('returnUrl'),
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
  /** On the way to Google: the button stays busy until the page unloads. */
  protected readonly leaving = signal(false);
  protected readonly fieldErrors = signal<JoinFieldErrors>({});
  protected readonly summary = computed(() => errorSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next submit (or, for a taken email, a new email). */
  protected readonly refusal = signal<JoinRefusal | GoogleRefusal | null>(null);

  constructor() {
    const query = this.route.snapshot.queryParamMap;
    if (!query.has('google')) return;
    if (googleReturnOf(query.get('google')) === 'failed') this.refusal.set('google-failed');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { google: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

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

  /** Starts Google sign-up and leaves for Google in a full-page redirect (L2-003 AC7, L2-049 AC9). */
  protected signUpWithGoogle(): void {
    if (this.leaving()) return;
    this.leaving.set(true);
    this.refusal.set(null);
    this.session
      .startGoogle({ intent: 'join' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ location }) => this.document.location.assign(location),
        error: (error: unknown) => {
          this.leaving.set(false);
          this.refusal.set(
            googleRefusalOf(error) === 'google-limited' ? 'google-limited' : 'google-failed',
          );
        },
      });
  }

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
