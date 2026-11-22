import { Component, input } from '@angular/core';

/** The design system's button variants this component renders so far. */
export type ButtonVariant = 'primary' | 'secondary';

/** The design system's button sizes this component renders so far. */
export type ButtonSize = 'sm' | 'md';

/**
 * The design system's `btn` block (docs/design-system/components/button.html), rendered as a link
 * that loads `href`. The label and an optional leading icon are projected. A `<button>` branch
 * arrives with the first screen that needs one.
 */
@Component({
  selector: 'cf-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly href = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');

  /**
   * The block and its modifiers as one class attribute: a plain attribute binding keeps Angular's
   * class-binding runtime out of the initial bundle (measured +4.6 kB in slice 30.1).
   */
  protected classes(): string {
    const size = this.size();
    return `btn btn--${this.variant()}${size === 'md' ? '' : ` btn--${size}`}`;
  }
}
