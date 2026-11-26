import { booleanAttribute, Component, input, output } from '@angular/core';
import { IconButton } from '../button/icon-button';

/**
 * The design system's context chip (docs/design-system/components/steps.html, "Context chip"):
 * what a form is about, such as "About this page" and the page's name, on one line that ends in
 * an ellipsis, with a small round Remove button named by `removeLabel` ("Remove page"). Pressing
 * it emits `removed`; the consumer drops the chip and moves focus on. `disabled` holds the button
 * still while the form sends. Every text is rendered as text.
 */
@Component({
  selector: 'cf-context-chip',
  imports: [IconButton],
  templateUrl: './context-chip.html',
  styleUrl: './context-chip.scss',
})
export class ContextChip {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly removeLabel = input('Remove');
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Remove was pressed. */
  readonly removed = output<void>();
}
