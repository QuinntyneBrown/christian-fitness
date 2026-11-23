import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { SESSION_SERVICE } from '@cf/api';
import {
  type MemberDestination,
  type MemberDestinationKey,
  SkipLink,
  TopBar,
} from '@cf/components';
import { initialsOf } from '@cf/domain';
import { filter } from 'rxjs';

/**
 * The places the header lists so far (ADR 0027); Services and Messages join as their slices land.
 * The profile is the avatar button, not a link.
 */
const DESTINATIONS: readonly MemberDestination[] = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'events', label: 'Events', href: '/events' },
];

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
  protected readonly destinations = DESTINATIONS;
  /** The place showing, read from the address; none on any other. */
  protected readonly current = signal<MemberDestinationKey | null>(placeOf(this.urlNow()));

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.current.set(placeOf(this.router.url)));
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

/** The place of the member app an address is in: Events covers an event under it too. */
function placeOf(url: string): MemberDestinationKey | null {
  const path = url.split(/[?#]/, 1)[0];
  if (path === '/profile') return 'profile';
  if (path === '/home') return 'home';
  if (path === '/events' || path.startsWith('/events/')) return 'events';
  return null;
}
