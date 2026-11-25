import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's chip bar (docs/design-system/components/chip.html, "Filter chips"): a
 * `role="group"` of filter chips named by `label` ("Filter events"), wrapping onto more lines.
 * With `divided`, a decorative `chip-bar__divider` (hidden from assistive technology, and on phones
 * where the bar wraps) separates the chips from what is projected with `slot="after"`, such as the
 * "Only events I'm going to" checkbox.
 */
@Component({
  selector: 'cf-chip-bar',
  imports: [NgTemplateOutlet],
  templateUrl: './chip-bar.html',
  styleUrl: './chip-bar.scss',
})
export class ChipBar {
  readonly label = input.required<string>();
  readonly divided = input(false, { transform: booleanAttribute });
  /** A `nav` landmark of filter links instead of a group, as the directory's kinds are. */
  readonly nav = input(false, { transform: booleanAttribute });
  /** Below 640 px the chips stay on one line and scroll sideways within the bar (`chip-bar--scroll`). */
  readonly scroll = input(false, { transform: booleanAttribute });
}
