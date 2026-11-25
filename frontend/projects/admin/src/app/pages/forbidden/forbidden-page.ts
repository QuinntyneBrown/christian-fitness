import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { STAFF_SESSION_SERVICE } from '@cf/api';
import { Button, StaffLayout } from '@cf/components';

/**
 * The "Staff only" screen (mock docs/mocks/pages/admin-forbidden/), opened by
 * `forbiddenInterceptor` in place of a screen whose read the API refused with 403, without
 * changing the URL (L2-047 AC1; ADR 0016). The heading takes focus. Sign out ends the staff
 * session, whose role no longer opens anything, and opens Staff sign in; while it waits the button
 * reads "Signing out…" and is disabled, and a failure enables it again (AC2). At `/admins-only`
 * (route data `{ reason: 'role' }`) it is the "Admins only" state (mock state `role`) a Moderator
 * meets on an Admins-only area (Events, Services), whose session is valid: the way out is "Go to dashboard", a plain
 * link, not Sign out (L2-019 AC5; ADR 0020, worded by ADR 0064).
 */
@Component({
  selector: 'cf-forbidden-page',
  imports: [Button, StaffLayout],
  templateUrl: './forbidden-page.html',
  styleUrl: './forbidden-page.scss',
})
export default class ForbiddenPage {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly signingOut = signal(false);
  protected readonly role = inject(ActivatedRoute).snapshot.data['reason'] === 'role';

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
