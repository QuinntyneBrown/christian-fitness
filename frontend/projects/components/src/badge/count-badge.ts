import { booleanAttribute, Component, computed, input } from '@angular/core';

/** The highest count a badge shows in figures; above it reads "99+". */
export const COUNT_BADGE_MAX = 99;

/** A count as a badge shows it: the number, or "99+" above 99. */
export function countText(count: number): string {
  return count > COUNT_BADGE_MAX ? `${COUNT_BADGE_MAX}+` : `${count}`;
}

/**
 * The design system's count badge (docs/design-system/components/badge.html, "Counts and dots"):
 * how many new things wait, such as unread messages. `count-badge` beside a navigation link, or
 * `count-pill` at the end of a row with `pill`. Read with its noun ("4 unread") through
 * `aria-label`, since a bare "4" means nothing; above 99 it shows "99+" but still reads the real
 * count. At zero it disappears. It is not a live region.
 */
@Component({
  selector: 'cf-count-badge',
  templateUrl: './count-badge.html',
  styleUrl: './count-badge.scss',
})
export class CountBadge {
  readonly count = input.required<number>();
  /** What is counted, read after the number: "unread". */
  readonly noun = input.required<string>();
  readonly pill = input(false, { transform: booleanAttribute });

  protected readonly text = computed(() => countText(this.count()));
}
