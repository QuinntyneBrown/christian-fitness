import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The loading region around skeletons (docs/design-system/components/skeleton.html,
 * "Accessibility"): `aria-busy` while loading, `aria-live="polite"` so the content's arrival is
 * not read line by line, and one visually hidden label naming what is loading. The screen
 * projects its skeletons in the real layout and sets `busy` to false when the content arrives.
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
}
