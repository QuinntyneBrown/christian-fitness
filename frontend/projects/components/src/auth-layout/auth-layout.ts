import { Component, input, output } from '@angular/core';
import { AuthBrand } from '../auth-brand/auth-brand';

/**
 * The design system's `auth` block (docs/design-system/assets/components.css, "Auth"): the brand
 * panel and, in the page's one `main`, a form with its heading, lead, fields, submit button and
 * the line that offers the other way in. The fields come through `[slot=fields]`, the button
 * through `[slot=submit]` and a form alert, when there is one, through `[slot=alert]` above the
 * fields. Submitting the form, by its button or by Enter in a field, emits
 * `submitted`; the page decides what that does. Join uses it; sign-in will too.
 */
@Component({
  selector: 'cf-auth-layout',
  imports: [AuthBrand],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  /** The words before the other way in, such as "Already a member?". */
  readonly altText = input.required<string>();
  /** The other way in, such as "Sign in", and where it goes. */
  readonly altLink = input.required<string>();
  readonly altHref = input.required<string>();

  /** The form was submitted; the browser's own submission is prevented. */
  readonly submitted = output<void>();

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
