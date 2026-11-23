import { Component, input } from '@angular/core';

/**
 * The design system's `profile-hero` block (docs/design-system/assets/components.css, "Profile";
 * mock `docs/mocks/pages/profile/`): the initials avatar, hidden from assistive technology since
 * the name follows it, the name as the page's heading, the meta line, then the home church and the
 * city, each only when given. Every value is rendered as text.
 */
@Component({
  selector: 'cf-profile-hero',
  templateUrl: './profile-hero.html',
  styleUrl: './profile-hero.scss',
})
export class ProfileHero {
  readonly name = input.required<string>();
  readonly initials = input.required<string>();
  /** The line under the name, such as "Member since January 2026". */
  readonly meta = input.required<string>();
  readonly homeChurch = input<string | null>(null);
  readonly city = input<string | null>(null);
}
