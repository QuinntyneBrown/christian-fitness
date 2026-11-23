import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Alert, Button, StaffLayout, TextField } from '@cf/components';
import {
  sessionEndingOf,
  staffSignInRefusalOf,
  twoStepEndingOf,
  type StaffSignInRefusal,
} from '@cf/domain';

/**
 * The alert Staff sign in shows: a refusal of its own, how the code screen ended (ADR 0013), or a
 * session that expired while idle (ADR 0016).
 */
type SignInAlert = StaffSignInRefusal | 'two-step-expired' | 'two-step-locked' | 'session-expired';

/**
 * The Staff sign in screen (mock docs/mocks/pages/admin-sign-in/): staff sign in with their work
 * email and password and go on to the code screen (L2-018 AC1, L2-046 AC1). One signal per field; while the
 * request is on its way the button reads "Signing in…" and is disabled, and the fields hold still.
 * A refusal shows one alert: wrong credentials name neither field (AC3), a member is told the
 * console is for the team (AC2), and anything else is a failure; the form stays as typed. The
 * note says a code comes next. Sent back from the code screen, it says why once: the pending
 * sign-in timed out or too many codes were tried (L2-046 AC4, AC5; ADR 0013). Sent here by
 * `sessionExpiredInterceptor`, it says the session expired (L2-018 AC5; ADR 0016).
 */
@Component({
  selector: 'cf-sign-in-page',
  imports: [Alert, Button, StaffLayout, TextField],
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
  protected readonly refusal = signal<SignInAlert | null>(this.endingAlert());

  /** Why the app sent staff here, from the navigation that opened this screen; none on a fresh visit. */
  private endingAlert(): SignInAlert | null {
    const navigation = this.router.currentNavigation();
    // Only the app's own navigation counts: a reload or Back restores the state, not the reason.
    if (navigation?.trigger !== 'imperative' || !navigation.previousNavigation) return null;
    const state = navigation.extras.state;
    if (sessionEndingOf(state)) return 'session-expired';
    const ending = twoStepEndingOf(state);
    return ending ? `two-step-${ending}` : null;
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.refusal.set(null);
    this.session
      .signIn({ email: this.email(), password: this.password() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // The password was right: the code comes next (L2-046 AC1).
        next: () => void this.router.navigateByUrl('/sign-in/verify'),
        // The form comes back as it was, so staff can try again.
        error: (error: unknown) => {
          this.refusal.set(staffSignInRefusalOf(error));
          this.submitting.set(false);
        },
      });
  }
}
