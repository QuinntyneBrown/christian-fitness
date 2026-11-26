import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The design system's caption (docs/design-system/components/pick-art.html, block `caption`): the
 * "Caption" heading with Copy, the platform's text as text in a `pre`, and its formatting hint
 * where it has one. Pressing Copy emits `copyCaption`; the page writes the clipboard and sets `copied`,
 * which reads "Copied" on the button and says "Caption copied" in a visually hidden status
 * (L2-072 AC7; ADR 0098).
 */
@Component({
  selector: 'cf-pick-caption',
  imports: [Button],
  templateUrl: './pick-caption.html',
  styleUrl: './pick-caption.scss',
})
export class PickCaption {
  readonly text = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly copied = input(false, { transform: booleanAttribute });
  readonly copyCaption = output<void>();
}
