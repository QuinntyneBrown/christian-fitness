import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { AppHeader } from '@cf/components';

/**
 * The routed layout around every member route, behind `memberAuthGuard` (ADR 0007, 0009): the app
 * header above the route. Sign out ends the session on the server and returns the member to the
 * start, a session that had already ended included (L2-004 AC5); any other failure keeps them where
 * they are with Sign out enabled.
 */
@Component({
  selector: 'cf-member-shell',
  imports: [AppHeader, RouterOutlet],
  templateUrl: './member-shell.html',
  styleUrl: './member-shell.scss',
})
export class MemberShell {
  private readonly session = inject(SESSION_SERVICE);
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
        next: () => void this.router.navigateByUrl('/'),
        error: () => this.signingOut.set(false),
      });
  }
}
