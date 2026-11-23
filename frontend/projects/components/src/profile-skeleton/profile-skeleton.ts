import { Component } from '@angular/core';

/**
 * The Profile screen while it loads (mock `docs/mocks/pages/profile/loading.html`): the hero and
 * both columns as the design system's `skeleton`s, in a region marked `aria-busy` with a visually
 * hidden "Loading profile" heading, so assistive technology hears what is happening. The shimmer
 * stands still under reduced motion.
 */
@Component({
  selector: 'cf-profile-skeleton',
  templateUrl: './profile-skeleton.html',
  styleUrl: './profile-skeleton.scss',
})
export class ProfileSkeleton {}
