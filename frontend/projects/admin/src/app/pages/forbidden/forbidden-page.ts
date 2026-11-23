import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Button, StaffLayout } from '@cf/components';

/**
 * The "Staff only" screen (mock docs/mocks/pages/admin-forbidden/), opened by
 * `forbiddenInterceptor` in place of a screen whose read the API refused with 403, without
 * changing the URL (L2-047 AC1; ADR 0014). The heading takes focus. Sign out ends the staff
 * session, whose role no longer opens anything, and opens Staff sign in; while it waits the button
 * reads "Signing out…" and is disabled, and a failure enables it again (AC2).
 */
@Component({
  selector: 'cf-forbidden-page',
  imports: [Button, StaffLayout],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.scss',
})
export class ForbiddenPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly signingOut = signal(false);

  protected signOut(): void {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.session
      .signOut()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/sign-in'),
        error: () => this.signingOut.set(false),
      });
  }
}
