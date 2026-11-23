import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The loading region around skeletons (docs/design-system/components/skeleton.html,
 * "Accessibility"): `aria-busy` while loading, `aria-live="polite"` so the content's arrival is
 * not read line by line, and one visually hidden label naming what is loading. The screen
 * projects its skeletons in the real layout and sets `busy` to false when the content arrives. With
 * `heading` the label is a visually hidden `h1`, for a screen with no other heading while it loads.
 */
@Component({
  selector: 'cf-skeleton-region',
  templateUrl: './skeleton-region.html',
  styleUrl: './skeleton-region.scss',
})
export class SkeletonRegion {
  /** What is loading, such as "Loading events". */
  readonly label = input.required<string>();
  readonly busy = input(true, { transform: booleanAttribute });
  /** The label is the page's one heading, for a screen that is all skeletons while it loads. */
  readonly heading = input(false, { transform: booleanAttribute });
}
