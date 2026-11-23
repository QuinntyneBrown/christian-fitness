import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { fieldDescribedBy, FormField } from '../form-field/form-field';

/** One choice of a select: the value it reports and the words it shows. */
export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * The design system's select (docs/design-system/components/select.html): a native `select` in a
 * form field, styled like the text field, with the platform's own arrow and picker. It shows the
 * option whose value is `value` and reports the option chosen with `valueChange`. With `prompt`, a
 * first option of value `""` ("Choose a category") stands for no choice yet. Invalid and disabled
 * like the text field; a native select has no read-only state. Every text is rendered as text.
 */
@Component({
  selector: 'cf-select',
  imports: [FormField],
  templateUrl: './select.html',
  styleUrl: './select.scss',
})
export class Select {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly value = input('');
  /** The first option, standing for no choice yet; none when there is a sensible default. */
  readonly prompt = input<string>();
  readonly optional = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** What is wrong with the choice; none when it is fine. */
  readonly error = input<string | null>();

  readonly valueChange = output<string>();

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.hint(), this.error()),
  );

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
