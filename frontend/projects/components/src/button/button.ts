import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's button variants, from highest emphasis to lowest; `inverse` and `on-brand`
 * are the primary and secondary pair on bordeaux panels, and `quiet` is the borderless,
 * full-width text action.
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'inverse' | 'on-brand' | 'quiet';

/**
 * The design system's button sizes: `xs` and `sm` are 36 px (44 px targets on touch), `default`
 * 44 px with a 15 px label, `md` the 16 px label of dialog footers, `lg` 52 px.
 */
export type ButtonSize = 'xs' | 'sm' | 'default' | 'md' | 'lg';

/** What a `<button>` does in its form. */
export type ButtonType = 'button' | 'submit';

/**
 * The design system's `btn` block (docs/design-system/components/button.html). With `href` it is
 * a link that loads that URL; without, a `<button>` of `type`, which can be `disabled` and `busy`.
 * Busy is announced with `aria-busy` and ignores further presses: the click neither submits the
 * form nor reaches the consumer, and the spinning loader icon (spinner.html, "In a button") sits
 * before the busy label. The label and an optional leading icon are projected once, through one
 * template both branches show.
 */
@Component({
  selector: 'cf-button',
  imports: [NgTemplateOutlet],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly href = input<string>();
  /** A link that opens in a new tab (`target="_blank"`, `rel="noopener"`). */
  readonly newTab = input(false, { transform: booleanAttribute });
  /** The `<button>`'s own id, for a link that moves focus to it (a field's error summary). */
  readonly buttonId = input<string>();
  /** The id of the text that describes the button, as `aria-describedby`. */
  readonly describedBy = input<string | null>();
  readonly type = input<ButtonType>('button');
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('default');
  /** Fills its container's width (`btn--block`). */
  readonly block = input(false, { transform: booleanAttribute });
  /** Shares a row equally with its siblings (`btn--grow`). */
  readonly grow = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Working on what was asked: announced with `aria-busy`; presses are ignored meanwhile. */
  readonly busy = input(false, { transform: booleanAttribute });

  /**
   * The block and its modifiers as one class attribute: a plain attribute binding keeps Angular's
   * class-binding runtime out of the initial bundle (measured +4.6 kB in slice 30.1).
   */
  protected classes(): string {
    const size = this.size();
    return `btn btn--${this.variant()}${size === 'default' ? '' : ` btn--${size}`}${
      this.block() ? ' btn--block' : ''
    }${this.grow() ? ' btn--grow' : ''}`;
  }

  /** A busy button keeps its place but does nothing: no submit, no click for the consumer. */
  protected onClick(event: Event): void {
    if (!this.busy()) return;
    event.preventDefault();
    event.stopPropagation();
  }
}
