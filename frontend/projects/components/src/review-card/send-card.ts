import { Component, input } from '@angular/core';

/**
 * The design system's send card (docs/design-system/components/review-card.html, block
 * `send-card`): the newsletter builder's dark card saying when the issue goes out and to how many.
 * Its label reads "Goes out", "Scheduled for" or "Was due"; the date is the display line; the meta
 * the time, zone and number of people. What it holds below (Schedule issue, Unschedule to edit, or
 * a missed issue's time and Reschedule) is projected. Every text is rendered as text.
 */
@Component({
  selector: 'cf-send-card',
  templateUrl: './send-card.html',
  styleUrl: './send-card.scss',
})
export class SendCard {
  readonly label = input.required<string>();
  /** "Sat Apr 18". */
  readonly date = input.required<string>();
  /** "7:00 AM Eastern · 6,800 people". */
  readonly meta = input.required<string>();
}
