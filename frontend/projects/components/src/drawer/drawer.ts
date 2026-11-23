import { Component, input, output } from '@angular/core';

let nextId = 0;

/**
 * The design system's drawer (docs/design-system/components/drawer.html): the presentation a CDK
 * Dialog renders for longer editing beside a list, never a hand-rolled panel. It draws the scrim
 * and a full-height panel against the right edge (full width below 512 px), the title, "Close", a
 * scrolling body that holds the form and a footer of actions projected through `[slot=foot]`. The
 * CDK Dialog's container owns `role="dialog"`, `aria-modal`, the focus trap, Escape and focus
 * return; its opener passes `titleId` as the config's `ariaLabelledBy` (ADR 0017). "Close" and the
 * scrim emit `closed`. Words are rendered as text.
 */
@Component({
  selector: 'cf-drawer',
  templateUrl: './drawer.html',
  styleUrl: './drawer.scss',
})
export class Drawer {
  /** "New event" or "Edit event". */
  readonly heading = input.required<string>();
  readonly titleId = input(`cf-drawer-title-${nextId++}`);
  readonly closeLabel = input('Close');

  readonly closed = output<void>();
}
