import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The design system's event row (docs/design-system/components/list.html, "Event row"): one link
 * that wraps the date column, the title, the meta and the end value (the price, or "Going" in
 * accent semibold), read in that order. Without an `href` the row is not a link (an issue's
 * calendar; issue.html). `large` is the landing page's size, whose title wraps.
 * With `loading` it is the same row of `cf-skeleton`s, for a `cf-skeleton-region` around the list
 * to name. Words are rendered as text.
 */
@Component({
  selector: 'cf-event-row',
  imports: [NgTemplateOutlet, Skeleton],
  templateUrl: './event-row.html',
  styleUrl: './event-row.scss',
})
export class EventRow {
  readonly href = input('');
  readonly month = input('');
  readonly day = input('');
  readonly heading = input('');
  /** Weekday, time and area, such as "Sat 8:00 AM · Waterfront". */
  readonly meta = input('');
  /** The price, or "Going". */
  readonly end = input<string>();
  /** The end says the member is going. */
  readonly going = input(false, { transform: booleanAttribute });
  readonly large = input(false, { transform: booleanAttribute });
  /** The title wraps rather than truncating (`event-row__title--wrap`): an issue's calendar. */
  readonly wrap = input(false, { transform: booleanAttribute });
  /** The event is still loading: skeletons in place of the date and the words. */
  readonly loading = input(false, { transform: booleanAttribute });
}
