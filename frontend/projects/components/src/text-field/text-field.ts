import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { fieldDescribedBy, FormField } from '../form-field/form-field';

/** The input types a text field renders: one line of typing, with the right keyboard. */
export type TextFieldType =
  'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'date' | 'time';

/**
 * The design system's text field (docs/design-system/components/text-field.html): an `input` in a
 * form field (`cf-form-field`) with its label and an optional hint the input is described by. The
 * value is the consumer's: `value` sets it and `valueChange` reports each edit. `readonly` keeps
 * what was typed on screen while a form is submitting, and stays in the tab order; `disabled` is
 * rare. With an `error`, the input is `aria-invalid` and described by the `field__error` in place
 * of the hint, with an optional link after the sentence, such as "Sign in instead?". With `code`,
 * the input takes the `input--code` look of a one-time code. A link projected with
 * `slot="label-action"` ends the label's row. Every text is rendered as text.
 */
@Component({
  selector: 'cf-text-field',
  imports: [FormField],
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
})
export class TextField {
  /** The input's id, unique on the page; the label and the hint hang off it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly type = input<TextFieldType>('text');
  /** What the browser may fill in (WCAG 1.3.5), such as `email` or `current-password`. */
  readonly autocomplete = input<string>();
  /** The keyboard a phone shows, such as `numeric` for a code. */
  readonly inputmode = input<string>();
  /** The design system's `input--code` look: large, spaced, tabular digits, centred. */
  readonly code = input(false, { transform: booleanAttribute });
  readonly optional = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  readonly value = input('');
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** What is wrong with the value; none when it is fine. */
  readonly error = input<string | null>();
  /** A link after the error's sentence, and where it goes. */
  readonly errorLink = input<string>();
  readonly errorHref = input<string>();

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.hint(), this.error()),
  );

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
