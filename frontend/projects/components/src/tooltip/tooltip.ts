import { Component, input, signal } from '@angular/core';

/** Where a tooltip sits: above its anchor, or below it near the top edge of the screen. */
export type TooltipPlacement = 'above' | 'below';

/**
 * The design system's tooltip (docs/design-system/components/tooltip.html): a short label above an
 * icon-only control (the projected anchor), shown after `--delay-tooltip` on hover or keyboard
 * focus. Its `tooltip` has `role="tooltip"` and the id `tooltipId`, which the control references
 * with `aria-labelledby` as its name (`cf-icon-button labelledBy`), so the two never disagree. An
 * optional `shortcut` shows as a keycap. Escape hides it without moving focus, until the pointer
 * leaves or focus moves on. It is never focusable and never holds anything to act on; on touch the
 * name is always there for screen readers. `placement="below"` flips it under an anchor near the
 * top edge.
 */
@Component({
  selector: 'cf-tooltip',
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.scss',
  // On the host, which the anchor's events reach: the anchor itself is not a control.
  host: {
    '(keydown.escape)': 'dismissed.set(true)',
    '(focusout)': 'dismissed.set(false)',
    '(mouseleave)': 'dismissed.set(false)',
  },
})
export class Tooltip {
  /** The tooltip's id, unique on the page, which names its control. */
  readonly tooltipId = input.required<string>();
  readonly text = input.required<string>();
  readonly shortcut = input<string>();
  readonly placement = input<TooltipPlacement>('above');

  /** Hidden by Escape until the pointer leaves or focus moves on. */
  protected readonly dismissed = signal(false);
}
