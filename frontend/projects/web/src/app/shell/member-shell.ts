import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import { SkipLink, TopBar } from '@cf/components';
import { initialsOf } from '@cf/domain';
import { filter } from 'rxjs';

/** The member's own profile, which the header's avatar opens (ADR 0015). */
const PROFILE_PATH = '/profile';

/**
 * The routed layout around every member route, behind `memberAuthGuard` (ADR 0007, 0009): the
 * design system's skip link, then the top bar's app header above the route (ADR 0019). Sign out ends the session on the server and returns the member to the
 * start, a session that had already ended included (L2-004 AC5); any other failure keeps them where
 * they are with Sign out enabled. The header's profile button shows the member's initials, read once
 * from `SESSION_SERVICE`, is current while Profile shows, and a plain click on it moves the router
 * (ADR 0015).
 */
@Component({
  selector: 'cf-member-shell',
  imports: [RouterOutlet, SkipLink, TopBar],
  templateUrl: './member-shell.html',
  styleUrl: './member-shell.scss',
})
export class MemberShell {
  private readonly session = inject(SESSION_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly signingOut = signal(false);
  protected readonly initials = signal('');
  protected readonly onProfile = signal(isProfile(this.urlNow()));

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.onProfile.set(isProfile(this.router.url)));
    this.session
      .current()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => this.initials.set(initialsOf(session.name)),
        // The guard has just read the session; a failure now leaves the avatar without letters.
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
        next: () => void this.router.navigateByUrl('/'),
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

function isProfile(url: string): boolean {
  return url.split(/[?#]/, 1)[0] === PROFILE_PATH;
}
