import { booleanAttribute, Component, input, output } from '@angular/core';

/** The input types a text field renders so far. */
export type TextFieldType = 'text' | 'email' | 'password';

/**
 * The design system's form field (docs/design-system/components/text-field.html): a `field` with
 * its label, an `input` and an optional hint the input is described by. The value is the
 * consumer's: `value` sets it and `valueChange` reports each edit. `readonly` keeps what was typed
 * on screen while a form is submitting.
 */
@Component({
  selector: 'cf-text-field',
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
})
export class TextField {
  /** The input's id, unique on the page; the label and the hint hang off it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly type = input<TextFieldType>('text');
  readonly autocomplete = input<string>();
  readonly hint = input<string>();
  readonly value = input('');
  readonly readonly = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
