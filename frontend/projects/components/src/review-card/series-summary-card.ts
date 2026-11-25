import { Component, input } from '@angular/core';
import { Card } from '../card/card';

/**
 * The design system's series summary card (docs/design-system/components/review-card.html,
 * block `series-summary-card`): the chosen series' photo, its name as a heading with `titleId` for
 * the page's section, "Hosted by …", the cadence and dates (none before the first date) and the
 * place, then three stats: joined of capacity with a `<meter>` whose text says how full it is,
 * the price with the drop-in price under it, and sessions left. The Edit details action is
 * projected into `[slot=action]`. Every value is worded by the page and rendered as text.
 */
@Component({
  selector: 'cf-series-summary-card',
  imports: [Card],
  templateUrl: './series-summary-card.html',
  styleUrl: './series-summary-card.scss',
})
export class SeriesSummaryCard {
  readonly titleId = input.required<string>();
  readonly title = input.required<string>();
  readonly imageSrc = input.required<string>();
  /** "Hosted by Lakeshore Runners Fellowship". */
  readonly host = input.required<string>();
  /** "Every Tuesday, 6:30 PM · Apr 7 – May 26", or none before the first date. */
  readonly when = input<string | null>(null);
  readonly place = input.required<string>();
  /** "31 of 40". */
  readonly joined = input.required<string>();
  readonly joinedCount = input.required<number>();
  readonly capacity = input.required<number>();
  /** "78% full", the meter's text. */
  readonly full = input.required<string>();
  /** "Free", "$64 for all 8". */
  readonly price = input.required<string>();
  /** "Drop-in $10", or none. */
  readonly dropIn = input<string | null>(null);
  /** "5 of 7". */
  readonly left = input.required<string>();
}
