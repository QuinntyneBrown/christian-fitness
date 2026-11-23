import { booleanAttribute, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The profile's hero (docs/design-system/assets/components.css, "Profile"; mock
 * `docs/mocks/pages/profile/`), a screen composite built from library components: the member's
 * `cf-avatar` at the avatar page's profile size (2xl, initials, hidden from assistive technology
 * since the name follows it), the name as the page's heading, the meta line, then the home church
 * and the city, each only when given, and the action projected through `[slot=action]`, such
 * as Edit profile. With `loading` it holds `cf-skeleton`s of the same boxes in
 * the same layout, for a `cf-skeleton-region` around it to name. Every value is rendered as text.
 */
@Component({
  selector: 'cf-profile-hero',
  imports: [Avatar, Skeleton],
  templateUrl: './profile-hero.html',
  styleUrl: './profile-hero.scss',
})
export class ProfileHero {
  readonly name = input('');
  readonly initials = input('');
  /** The line under the name, such as "Member since January 2026". */
  readonly meta = input('');
  readonly homeChurch = input<string | null>(null);
  readonly city = input<string | null>(null);
  /** The profile is still loading: skeletons in place of the avatar and the words. */
  readonly loading = input(false, { transform: booleanAttribute });
}
