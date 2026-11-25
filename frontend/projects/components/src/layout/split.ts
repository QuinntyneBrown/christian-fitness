import { booleanAttribute, Component, input } from '@angular/core';

/** The pages' two-column ratios (layout.html, "Split"). */
export type SplitVariant = 'home' | 'detail' | 'profile' | 'services' | 'dashboard' | 'picker-wide';

/**
 * The design system's split (docs/design-system/components/layout.html, "Split"): one column on
 * phones and, from LG, the main column and the aside side by side in the page's ratio. The screen
 * projects the main column first and the aside second, so reading and tab order match what shows
 * (layout.html, "Accessibility"). Each column may shrink below its content's width, so a table or
 * a long word scrolls or wraps inside it. `flush` drops the 32 px above it.
 */
@Component({
  selector: 'cf-split',
  templateUrl: './split.html',
  styleUrl: './split.scss',
})
export class Split {
  readonly variant = input.required<SplitVariant>();
  readonly flush = input(false, { transform: booleanAttribute });

  protected classes(): string {
    const variant = this.variant();
    const modifier =
      variant === 'picker-wide' ? 'split--picker split--picker-wide' : `split--${variant}`;
    return `split ${modifier}${this.flush() ? ' split--flush' : ''}`;
  }
}
