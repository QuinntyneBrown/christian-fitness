import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';

/** The design system's button variants this component renders so far. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/** The design system's button sizes this component renders so far. */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** What a `<button>` does in its form. */
export type ButtonType = 'button' | 'submit';

/**
 * The design system's `btn` block (docs/design-system/components/button.html). With `href` it is
 * a link that loads that URL; without, a `<button>` of `type`, which can be `disabled` and `busy`
 * (`aria-busy`, the mock's submitting state). The label and an optional leading icon are projected
 * once, through one template both branches show.
 */
@Component({
  selector: 'cf-button',
  imports: [NgTemplateOutlet],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly href = input<string>();
  readonly type = input<ButtonType>('button');
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  /** Fills its container's width (`btn--block`). */
  readonly block = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Working on what was asked: announced with `aria-busy`. */
  readonly busy = input(false, { transform: booleanAttribute });

  /**
   * The block and its modifiers as one class attribute: a plain attribute binding keeps Angular's
   * class-binding runtime out of the initial bundle (measured +4.6 kB in slice 30.1).
   */
  protected classes(): string {
    const size = this.size();
    return `btn btn--${this.variant()}${size === 'md' ? '' : ` btn--${size}`}${this.block() ? ' btn--block' : ''}`;
  }
}
