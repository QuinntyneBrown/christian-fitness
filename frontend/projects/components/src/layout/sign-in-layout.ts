import { booleanAttribute, Component, input, output } from '@angular/core';
import { BrandLockup } from '../brand-lockup/brand-lockup';

/**
 * The design system's sign-in card (docs/design-system/components/layout.html, block `signin`): a
 * header with the lockup back to the landing page over one centred card on the canvas, holding the
 * heading, the lead, an alert (`[slot=alert]`), Google's way in (`[slot=sso]`: the Google button
 * and "or with email", or the notice about the account Google returned), the email form's fields
 * (`[slot=fields]`) and button (`[slot=submit]`), and the line that offers the other way in
 * (L2-004 AC7; ADR 0099); `formless` leaves the form out. Submitting the form, by its button or by Enter, emits `submitted`.
 */
@Component({
  selector: 'cf-sign-in-layout',
  imports: [BrandLockup],
  templateUrl: './sign-in-layout.html',
  styleUrl: './sign-in-layout.scss',
})
export class SignInLayout {
  readonly heading = input.required<string>();
  readonly lead = input('');
  /** The words before the other way in, such as "New to Christian Fitness?". */
  readonly altText = input('');
  readonly altLink = input.required<string>();
  readonly altHref = input.required<string>();
  /**
   * No email form: the notice in `[slot=sso]` stands in its place, as for an account that is
   * deleting (mock `sign-in/deleting`; ADR 0118).
   */
  readonly formless = input(false, { transform: booleanAttribute });

  /** The form was submitted; the browser's own submission is prevented. */
  readonly submitted = output<void>();

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
