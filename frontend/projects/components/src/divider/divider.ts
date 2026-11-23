import { Component, input } from '@angular/core';

/**
 * The design system's divider forms: `horizontal` (an `hr` between sections), `label` (a rule
 * with centred text, such as "or") and `vertical` (between groups in a row).
 */
export type DividerVariant = 'horizontal' | 'label' | 'vertical';

/**
 * The design system's divider (docs/design-system/components/divider.html): a hairline that
 * separates content without adding weight. A thematic break is an `hr`; a labelled divider has
 * `role="separator"` and reads its text; a vertical one is decorative and hidden from assistive
 * technology. Never focusable. Prefer spacing, or a section's own rule, first.
 */
@Component({
  selector: 'cf-divider',
  templateUrl: './divider.html',
  styleUrl: './divider.scss',
})
export class Divider {
  readonly variant = input<DividerVariant>('horizontal');
  /** The words of a labelled divider, such as "or". */
  readonly label = input<string>('');
}
