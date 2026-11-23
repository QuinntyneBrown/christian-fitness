import { Component, input } from '@angular/core';
import { FormField } from '../form-field/form-field';

/**
 * The design system's interest list (docs/design-system/components/chip.html, "Interest
 * toggles"): projected `cf-interest` toggles, wrapping, in a `fieldset` named by its legend
 * (`cf-form-field` with `group`), with an optional hint or error the fieldset is described by.
 */
@Component({
  selector: 'cf-interest-list',
  imports: [FormField],
  templateUrl: './interest-list.html',
  styleUrl: './interest-list.scss',
})
export class InterestList {
  readonly fieldId = input.required<string>();
  readonly legend = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string | null>();
}
