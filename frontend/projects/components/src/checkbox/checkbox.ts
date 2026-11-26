import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's checkbox forms: `compact` (`check`) for filter bars, `form`
 * (`check check--ui`) for a confirmation inside a form, and `choice` for an option in a group,
 * with a bold label and an optional muted description.
 */
export type CheckboxVariant = 'compact' | 'form' | 'choice';

/**
 * The design system's checkbox (docs/design-system/components/checkbox.html): a native checkbox
 * inside its `label`, so the whole label toggles it and names it, description included. It takes
 * effect on submit; a setting that applies at once is a switch. `checked` sets it and
 * `checkedChange` reports each toggle. `indeterminate` marks a parent of a partly checked list,
 * `invalid` sets `aria-invalid` (the group's error says why), and `disabled` dims the label. A
 * compact box that saves as it is ticked is `busy` while it saves and named by `ariaLabel`. Every
 * text is rendered as text.
 */
@Component({
  selector: 'cf-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  readonly label = input.required<string>();
  /**
   * Compact only: words after the label that only assistive technology reads, completing its name
   * ("Drop in" + " on Sat, Apr 25"; ADR 0102).
   */
  readonly hiddenLabel = input<string>();
  readonly description = input<string>();
  readonly variant = input<CheckboxVariant>('form');
  /** The checkbox's id, when something must find it, such as an error summary's link. */
  readonly fieldId = input<string>();
  readonly name = input<string>();
  readonly value = input<string>();
  readonly checked = input(false, { transform: booleanAttribute });
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly describedBy = input<string>();
  readonly invalid = input(false, { transform: booleanAttribute });
  /**
   * Compact only: the box's name when its words change, such as "Came: Grace Thompson" beside
   * "Came" or "Saving…" (ADR 0106). Without it the label names the box.
   */
  readonly ariaLabel = input<string>();
  /**
   * Compact only: its change is being saved (`aria-busy`). It stays enabled, so focus stays on it
   * and a failed save can put it back (ADR 0106).
   */
  readonly busy = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
