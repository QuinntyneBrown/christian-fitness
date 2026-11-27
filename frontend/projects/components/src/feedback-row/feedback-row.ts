import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/** The kinds of a note, with the same codes as the form (L2-074 AC1). */
export type FeedbackRowKind = 'idea' | 'problem' | 'correction' | 'thanks';

/**
 * The design system's feedback row (docs/design-system/components/feedback-row.html, block
 * `feedback-row`): one note in the inbox's list, a link that chooses it. It reads its kind's icon,
 * who sent it, when and the start of its text, clamped to two lines; a New note's sender is bold,
 * and the kind and status are also in words for assistive technology ("Something’s off, New"), so
 * neither the icon nor the weight is the only carrier. The chosen row is `aria-current="page"`. A
 * plain click emits `navigate` with the `href`. Every text is rendered as text.
 */
@Component({
  selector: 'cf-feedback-row',
  templateUrl: './feedback-row.html',
  styleUrl: './feedback-row.scss',
})
export class FeedbackRow {
  readonly href = input.required<string>();
  readonly kind = input.required<FeedbackRowKind>();
  readonly from = input.required<string>();
  /** "35 min ago". */
  readonly when = input.required<string>();
  readonly text = input.required<string>();
  /** The kind and status in words: "Something’s off, New". */
  readonly label = input.required<string>();
  readonly isNew = input(false, { transform: booleanAttribute });
  readonly current = input(false, { transform: booleanAttribute });

  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
