import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, computed, input } from '@angular/core';

/**
 * The id a control is described by: its error when it has one, else its hint, else none. Ids are
 * derived from the control's id (`f-name-hint`, `f-name-error`) so they never collide.
 */
export function fieldDescribedBy(
  fieldId: string,
  hint: string | null | undefined,
  error: string | null | undefined,
): string | null {
  if (error) return `${fieldId}-error`;
  return hint ? `${fieldId}-hint` : null;
}

/**
 * The design system's form field (docs/design-system/components/form-field.html): the wrapper every
 * input wears. A `field` with its `field__label` tied to the control by `fieldId`, an optional
 * "(optional)" marker, the projected control, then a `field__hint` or, in its place, a
 * `field__error` with an optional link after the sentence. A link projected with
 * `slot="label-action"` sits at the end of the label's row (`field-row`), such as "Forgot
 * password?". With `group`, a group of checkboxes or radios is a `fieldset` named by its
 * `field__legend` and described by its message. The control itself carries `aria-invalid` and
 * `aria-describedby` (see `fieldDescribedBy`). Every text is rendered as text.
 */
@Component({
  selector: 'cf-form-field',
  imports: [NgTemplateOutlet],
  templateUrl: './form-field.html',
  styleUrl: './form-field.scss',
})
export class FormField {
  /** The control's id, unique on the page; the label, hint and error hang off it. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  /** Required is the default and is not marked; optional adds a muted "(optional)". */
  readonly optional = input(false, { transform: booleanAttribute });
  /** A group of checkboxes or radios: a `fieldset` with a legend. */
  readonly group = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>();
  /** What is wrong with the value; none when it is fine. */
  readonly error = input<string | null>();
  /** A link after the error's sentence, and where it goes. */
  readonly errorLink = input<string>();
  readonly errorHref = input<string>();

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.hint(), this.error()),
  );
}
