import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * The design system's review card (docs/design-system/components/review-card.html, block
 * `review-card`): a whole-card link on the dark chrome, above Stories, for one story In review. It
 * reads what waits and since when, the headline, the writer and section, and an action drawn as an
 * inverse button that is not a second control, since the whole card is the link. A plain click
 * emits `navigate` with the `href`, so the app moves without reloading; a modified click is left to
 * the browser. Every text is rendered as text.
 */
@Component({
  selector: 'cf-review-card',
  templateUrl: './review-card.html',
  styleUrl: './review-card.scss',
})
export class ReviewCard {
  readonly href = input.required<string>();
  /** "Waiting for your review · Submitted 1 hour ago". */
  readonly label = input.required<string>();
  readonly title = input.required<string>();
  /** "Priya Raman · Nutrition". */
  readonly meta = input<string>('');
  readonly actionLabel = input('Review');

  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
