import { booleanAttribute, Component, computed, input } from '@angular/core';
import { DateBadge } from '../date-badge/date-badge';

/** What the footer's end says, and whether it is scarcity (accent) rather than the price. */
export interface EventCardEnd {
  text: string;
  scarce: boolean;
}

/**
 * The footer's end of an event card (docs/design-system/components/event-card.html, "Overview"):
 * the price, or, when the screen passes the spots left because few remain, "N spots left" in
 * words, "1 spot left", or "Full" when none remain.
 */
export function eventCardEnd(price: string, spotsLeft: number | undefined): EventCardEnd {
  if (spotsLeft === undefined) {
    return { text: price, scarce: false };
  }
  if (spotsLeft <= 0) {
    return { text: 'Full', scarce: true };
  }
  return { text: spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`, scarce: true };
}

/**
 * The design system's event card (docs/design-system/components/event-card.html): one link that
 * wraps the card, so its name reads type, date, time, title, place, going and price, with no
 * nested link or button. The image is decorative and the date badge hidden; the date is repeated
 * in visually hidden text in the meta line. The title is a heading (`h2` in the grid, or `h3`), so
 * the grid can be navigated by heading. "Going" is a word on the image when the member is
 * registered, and few spots left is said in words, not colour alone. A session of a series adds
 * its series line under the meta line (`event-card__series`). Words are rendered as text.
 */
@Component({
  selector: 'cf-event-card',
  imports: [DateBadge],
  templateUrl: './event-card.html',
  styleUrl: './event-card.scss',
})
export class EventCard {
  readonly href = input.required<string>();
  readonly imageSrc = input.required<string>();
  readonly imageWidth = input(1376);
  readonly imageHeight = input(768);
  readonly month = input.required<string>();
  readonly day = input.required<string>();
  /** The date in words for assistive technology, such as "Apr 18". */
  readonly date = input.required<string>();
  /** The event type, such as "Run". */
  readonly type = input.required<string>();
  /** Weekday and time, such as "Sat 6:45 AM". */
  readonly time = input.required<string>();
  readonly heading = input.required<string>();
  readonly headingLevel = input<2 | 3>(2);
  readonly place = input.required<string>();
  readonly going = input.required<number>();
  readonly price = input.required<string>();
  /** Spots left, passed only when few remain. */
  readonly spotsLeft = input<number>();
  /** A session's series line, "Part of … · Session 3 of 8 · Every Tuesday"; none for a standalone event. */
  readonly series = input<string>();
  /** The member is registered: shows "Going" on the image. */
  readonly registered = input(false, { transform: booleanAttribute });

  protected readonly end = computed(() => eventCardEnd(this.price(), this.spotsLeft()));
}
