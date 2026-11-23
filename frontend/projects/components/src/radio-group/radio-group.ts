import { booleanAttribute, Component, input, output } from '@angular/core';
import { FormField } from '../form-field/form-field';

/** One answer of a radio group: the value it reports, its words and an optional description. */
export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

/**
 * The design system's radio group (docs/design-system/components/radio-group.html): exactly one
 * choice from a short list, every option in view. Native radios sharing `name`, each inside its
 * `choice` label, in a `fieldset` named by its legend (`cf-form-field` with `group`). The option
 * whose value is `value` is checked (none without one, when there is no safe default), and
 * `valueChange` reports the option chosen; arrow keys move the choice natively. `row` lays short
 * labels side by side, `card` draws bordered options that fill with the accent tint when chosen.
 * With an `error`, every radio is `aria-invalid` and the fieldset is described by the error. Every
 * text is rendered as text.
 */
@Component({
  selector: 'cf-radio-group',
  imports: [FormField],
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
})
export class RadioGroup {
  /** The group's id; its hint, error and each radio's id hang off it. */
  readonly fieldId = input.required<string>();
  readonly legend = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly RadioOption[]>();
  readonly value = input<string | null>(null);
  readonly row = input(false, { transform: booleanAttribute });
  readonly card = input(false, { transform: booleanAttribute });
  readonly optional = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  /** What is wrong with the choice, such as none made; none when it is fine. */
  readonly error = input<string | null>();

  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
