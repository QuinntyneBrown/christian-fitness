import { Component, computed, input } from '@angular/core';

/** A fill's share of its capacity, rounded, and whether it is nearly full. */
export interface FillShare {
  percent: number;
  high: boolean;
}

/** Nearly full starts here (docs/design-system/components/stat.html, "States"). */
const nearlyFull = 90;

/**
 * Registrations against capacity as a whole percentage, and nearly full at 90% and over. An
 * event with no capacity is 0%.
 */
export function fillOf(count: number, capacity: number): FillShare {
  const percent = capacity > 0 ? Math.round((count / capacity) * 100) : 0;
  return { percent, high: percent >= nearlyFull };
}

/**
 * The design system's fill meter (docs/design-system/components/stat.html, "Fill meter"): the
 * numbers first ("142 / 200", "71%"), then a native `<meter>` that repeats them in words for
 * assistive technology ("Easter Sunrise 5K: 142 of 200 registered"), so the bar never carries the
 * figure alone. Nearly full makes the percentage accent and semibold; the number says it too.
 */
@Component({
  selector: 'cf-fill',
  templateUrl: './fill.html',
  styleUrl: './fill.scss',
})
export class Fill {
  /** What is being filled, such as the event's name. */
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly capacity = input.required<number>();

  protected readonly share = computed(() => fillOf(this.count(), this.capacity()));
}
