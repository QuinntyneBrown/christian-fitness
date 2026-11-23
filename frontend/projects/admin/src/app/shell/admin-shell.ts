import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { STAFF_SESSION_SERVICE, type StaffSessionDto } from '@cf/api';
import { AdminLayout, type AdminNavItem } from '@cf/components';
import { areasFor, currentAdminArea, initialsOf } from '@cf/domain';
import { filter } from 'rxjs';

/**
 * The routed layout around every staff route, behind `staffAuthGuard` (ADR 0011): the admin
 * layout with the areas the signed-in role opens, `aria-current` on the one showing (L2-021 AC1,
 * L2-019 AC5; ADR 0017), and the signed-in staff member, read once from `STAFF_SESSION_SERVICE`.
 * No area is listed until the session has loaded, so a Moderator never sees Events or Services. A plain click on an area moves the router;
 * Sign out ends the session on the server and returns to Staff sign in, a session that had already
 * ended included (L2-018 AC6); any other failure keeps staff where they are with Sign out enabled.
 */
@Component({
  selector: 'cf-admin-shell',
  imports: [AdminLayout, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly items = signal<readonly AdminNavItem[]>([]);
  protected readonly current = signal(currentAdminArea(this.urlNow()));
  protected readonly staff = signal<StaffSessionDto | null>(null);
  protected readonly initials = signal('');
  protected readonly signingOut = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.current.set(currentAdminArea(this.router.url)));
    this.session
      .current()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (staff) => {
          this.staff.set(staff);
          this.initials.set(initialsOf(staff.name));
          this.items.set(
            areasFor(staff.role).map(({ key, label, path }) => ({ key, label, href: path })),
          );
        },
        // The guard has just read the session; a failure now leaves the name out, nothing more.
        error: () => undefined,
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

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

  /** Where the navigation that is creating the shell is going, or else where the router is. */
  private urlNow(): string {
    const navigation = this.router.currentNavigation();
    return navigation
      ? this.router.serializeUrl(navigation.finalUrl ?? navigation.extractedUrl)
      : this.router.url;
  }
}
