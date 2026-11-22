import { booleanAttribute, Component, computed, input, output } from '@angular/core';

/** The input types a text field renders so far. */
export type TextFieldType = 'text' | 'email' | 'password';

/**
 * The design system's form field (docs/design-system/components/text-field.html): a `field` with
 * its label, an `input` and an optional hint the input is described by. The value is the
 * consumer's: `value` sets it and `valueChange` reports each edit. `readonly` keeps what was typed
 * on screen while a form is submitting. With an `error`, the input is `aria-invalid` and described
 * by the `field__error` in place of the hint, with an optional link after the sentence, such as
 * "Sign in instead?". Every text is rendered as text.
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
  /** What is wrong with the value; none when it is fine. */
  readonly error = input<string | null>();
  /** A link after the error's sentence, and where it goes. */
  readonly errorLink = input<string>();
  readonly errorHref = input<string>();

  protected readonly describedBy = computed(() => {
    if (this.error()) return `${this.fieldId()}-error`;
    return this.hint() ? `${this.fieldId()}-hint` : null;
  });

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
