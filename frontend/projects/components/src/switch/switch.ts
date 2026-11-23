import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's switch (docs/design-system/components/switch.html): a setting that applies
 * the moment it is flipped, with no Save button. A native checkbox with `role="switch"` (announced
 * on or off) inside the row's `label`, which names the setting; an optional description says what
 * on means. `checked` sets it and `checkedChange` reports each flip. While the setting saves,
 * `busy` sets `aria-busy` on the row and keeps the new position; on failure the consumer flips it
 * back. `start` puts the switch before the label. A switch cannot be invalid. Every text is
 * rendered as text.
 */
@Component({
  selector: 'cf-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
})
export class Switch {
  /** Names the setting, never its state: "Message notifications", not "On". */
  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly name = input<string>();
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  /** The switch before the label, for short inline settings. */
  readonly start = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
