import { booleanAttribute, Component, input } from '@angular/core';
import { FormField } from '../form-field/form-field';

/**
 * The design system's checkbox group (docs/design-system/components/checkbox.html, "Group with
 * descriptions"): a `fieldset` named by its legend (`cf-form-field` with `group`), the projected
 * `choice` checkboxes stacked in a `choice-group` (or wrapping in a row with `row`), and the
 * group's hint or error, which the fieldset is described by.
 */
@Component({
  selector: 'cf-checkbox-group',
  imports: [FormField],
  templateUrl: './checkbox-group.html',
  styleUrl: './checkbox-group.scss',
})
export class CheckboxGroup {
  /** The group's id; its hint and error hang off it. */
  readonly fieldId = input.required<string>();
  readonly legend = input.required<string>();
  readonly optional = input(false, { transform: booleanAttribute });
  readonly row = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  readonly error = input<string | null>();
}
