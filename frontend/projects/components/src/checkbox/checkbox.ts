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
 * `invalid` sets `aria-invalid` (the group's error says why), and `disabled` dims the label. Every
 * text is rendered as text.
 */
@Component({
  selector: 'cf-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly variant = input<CheckboxVariant>('form');
  readonly name = input<string>();
  readonly value = input<string>();
  readonly checked = input(false, { transform: booleanAttribute });
  readonly indeterminate = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });

  readonly checkedChange = output<boolean>();

  protected onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
