import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's event row (docs/design-system/components/list.html, "Event row"): one link
 * that wraps the date column, the title, the meta and the end value (the price, or "Going" in
 * accent semibold), read in that order. `large` is the landing page's size, whose title wraps.
 * Words are rendered as text.
 */
@Component({
  selector: 'cf-event-row',
  templateUrl: './event-row.html',
  styleUrl: './event-row.scss',
})
export class EventRow {
  readonly href = input.required<string>();
  readonly month = input.required<string>();
  readonly day = input.required<string>();
  readonly heading = input.required<string>();
  /** Weekday, time and area, such as "Sat 8:00 AM · Waterfront". */
  readonly meta = input.required<string>();
  /** The price, or "Going". */
  readonly end = input<string>();
  /** The end says the member is going. */
  readonly going = input(false, { transform: booleanAttribute });
  readonly large = input(false, { transform: booleanAttribute });
}
