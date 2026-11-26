import { Component, computed, DestroyRef, forwardRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import {
  ADMIN_COUNTS,
  ADMIN_COUNTS_SERVICE,
  type AdminCountsDto,
  type AdminCountsRefresh,
  STAFF_SESSION_SERVICE,
  type StaffSessionDto,
} from '@cf/api';
import { AdminLayout, type AdminNavItem, Banner } from '@cf/components';
import {
  adminNavOf,
  adminPageIsFlush,
  currentAdminArea,
  initialsOf,
  NetworkStatus,
  showsAreaGroups,
} from '@cf/domain';
import { filter, type Subscription } from 'rxjs';
import { HttpAdminCountsService } from '../services/http-admin-counts.service';

/**
 * The routed layout around every staff route, behind `staffAuthGuard` (ADR 0011): the admin
 * layout with the areas the signed-in role opens, `aria-current` on the one showing (L2-021 AC1,
 * L2-019 AC5; ADR 0020), and the signed-in staff member, read once from `STAFF_SESSION_SERVICE`.
 * No area is listed until the session has loaded, so a Moderator never sees Events or Services. A plain click on an area moves the router;
 * Sign out ends the session on the server and returns to Staff sign in, a session that had already
 * ended included (L2-018 AC6); any other failure keeps staff where they are with Sign out enabled.
 * Beside each area it counts the work waiting (`GET /api/admin/counts`; ADR 0090), read on entry and
 * again when a screen asks through `ADMIN_COUNTS`; a failed read shows no count and no error.
 */
@Component({
  selector: 'cf-admin-shell',
  host: { '[attr.data-offline-ready]': 'offlineReady() ? "" : null' },
  imports: [AdminLayout, Banner, RouterOutlet],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
  providers: [
    { provide: ADMIN_COUNTS_SERVICE, useClass: HttpAdminCountsService },
    { provide: ADMIN_COUNTS, useExisting: forwardRef(() => AdminShell) },
  ],
})
export default class AdminShell implements AdminCountsRefresh {
  private readonly session = inject(STAFF_SESSION_SERVICE);
  private readonly countsService = inject(ADMIN_COUNTS_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly network = inject(NetworkStatus);

  /** The counts read in flight; a newer read replaces it. */
  private countsRead: Subscription | null = null;
  private readonly counts = signal<AdminCountsDto | null>(null);
  protected readonly items = computed<readonly AdminNavItem[]>(() => {
    const staff = this.staff();
    return staff ? adminNavOf(staff.role, this.counts()) : [];
  });
  protected readonly current = signal(currentAdminArea(this.urlNow()));
  /** The story editor fills the page edge to edge (ADR 0097). */
  protected readonly flush = signal(adminPageIsFlush(this.urlNow()));
  protected readonly staff = signal<StaffSessionDto | null>(null);
  protected readonly initials = signal('');
  /** An Admin's navigation names its groups; a Moderator's one list does not (L2-021 AC1). */
  protected readonly showGroups = signal(false);
  protected readonly signingOut = signal(false);
  /** True once the offline screen's lazy chunk is loaded, so it can open with no network. */
  protected readonly offlineReady = signal(false);

  constructor() {
    if (this.network.online()) {
      void import('../pages/offline/offline-page').then(() => this.offlineReady.set(true));
    }
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.current.set(currentAdminArea(this.router.url));
        this.flush.set(adminPageIsFlush(this.router.url));
      });
    this.session
      .current()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (staff) => {
          this.staff.set(staff);
          this.initials.set(initialsOf(staff.name));
          this.showGroups.set(showsAreaGroups(staff.role));
        },
        // The guard has just read the session; a failure now leaves the name out, nothing more.
        error: () => undefined,
      });
    this.refresh();
  }

  /** Reads the counts again, for a screen that has just changed one. */
  refresh(): void {
    this.countsRead?.unsubscribe();
    this.countsRead = this.countsService
      .counts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (counts) => this.counts.set(counts),
        error: () => this.counts.set(null),
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
