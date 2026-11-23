import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { CountBadge } from '../badge/count-badge';
import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Button } from '../button/button';
import { isPlainClick } from '../link/plain-click';
import type { MemberDestination, MemberDestinationKey } from './member-destination';

/** The design system's two top bars: the member `app` header and the public `site` header. */
export type TopBarVariant = 'app' | 'site';

/**
 * The design system's top bar (docs/design-system/components/top-bar.html), sticky at the top.
 *
 * The `app` header (`app-header`) sits on every signed-in member screen: the lockup linking to
 * `homeHref`, the `app-nav` links labelled "Primary" from MD up (every destination but Profile,
 * the current one marked `aria-current="page"`, Messages carrying the unread count read as
 * "4 unread"), the profile button (`profile-button`, the member's initials, named "Your profile",
 * with its gold ring when Profile is current) and a ghost **Sign out** button 44 px tall at every
 * viewport (L2-008 AC1, AC3, AC4; ADR 0009). With no destinations there is no `nav`. A plain click
 * on a link or the profile button emits `navigate` with its `href`; a modified click is the
 * browser's. Sign out emits `signOut`; with `signingOut` it is disabled and busy.
 *
 * The `site` header (`site-header`) sits on public pages: the lockup, a ghost "Sign in" (hidden
 * below 640 px) and a primary "Join free". Every text is rendered as text.
 */
@Component({
  selector: 'cf-top-bar',
  imports: [BrandLockup, Button, CountBadge],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
})
export class TopBar {
  readonly variant = input<TopBarVariant>('app');
  readonly homeHref = input.required<string>();
  /** The member app's places, in order; Profile among them is the profile button, not a link. */
  readonly destinations = input<readonly MemberDestination[]>([]);
  /** The place showing; none on a screen outside them (an error screen). */
  readonly current = input<MemberDestinationKey | null>(null);
  /** Unread messages, shown on Messages; none at zero. */
  readonly unread = input(0);
  /** Where the profile button goes; without it, no button shows. */
  readonly profileHref = input<string>();
  /** The signed-in member's initials, shown in the profile button. */
  readonly profileInitials = input('');
  readonly signingOut = input(false, { transform: booleanAttribute });
  /** The site header's ghost "Sign in" and primary "Join free". */
  readonly signInHref = input('/sign-in');
  readonly joinHref = input('/join');

  /** A plain click on a link or the profile button, with its `href`. */
  readonly navigate = output<string>();
  readonly signOut = output();

  protected readonly links = computed(() =>
    this.destinations().filter((destination) => destination.key !== 'profile'),
  );

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
