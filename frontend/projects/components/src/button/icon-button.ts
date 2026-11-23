import { booleanAttribute, Component, input } from '@angular/core';
import type { ButtonType } from './button';

/** The design system's icon button sizes. */
export type IconButtonSize = 'default' | 'sm';

/**
 * The design system's `icon-button` block (docs/design-system/components/button.html, "Icons,
 * icon-only and width"): a round, label-less button for close, dismiss and back. The projected
 * SVG icon is decorative; the button is named by `label` (`aria-label`), or by a tooltip's id
 * through `labelledBy`, never both. On coarse pointers its target grows to 44 × 44 px.
 */
@Component({
  selector: 'cf-icon-button',
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
})
export class IconButton {
  /** The verb that names the button: "Close", "Dismiss", "Back to conversations". */
  readonly label = input<string>();
  /** The id of the tooltip that names the button instead of `label`. */
  readonly labelledBy = input<string>();
  readonly type = input<ButtonType>('button');
  readonly size = input<IconButtonSize>('default');
  readonly disabled = input(false, { transform: booleanAttribute });
}
