import { Component, input } from '@angular/core';

/** A white badge pinned to an event card's image, or a solid tile in flow (date-badge.html). */
export type DateBadgeVariant = 'badge' | 'tile';

/**
 * The design system's date badge (docs/design-system/components/date-badge.html): the month and
 * day as a visual shortcut, hidden from assistive technology because the full date is always in
 * text nearby. A `badge` needs a positioned parent (an event card's media); a `tile` sits in flow.
 * The untiled date column of an event row belongs to `cf-event-row`.
 */
@Component({
  selector: 'cf-date-badge',
  templateUrl: './date-badge.html',
  styleUrl: './date-badge.scss',
})
export class DateBadge {
  readonly variant = input<DateBadgeVariant>('badge');
  /** Three letters, such as "Apr". */
  readonly month = input.required<string>();
  readonly day = input.required<string>();
}
