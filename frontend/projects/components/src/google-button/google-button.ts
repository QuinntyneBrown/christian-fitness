import { booleanAttribute, Component, input, output } from '@angular/core';
import { GoogleMark } from './google-mark';

/** Google's own wording for the button (L2-049 AC10). */
export type GoogleButtonLabel =
  | 'Continue with Google'
  | 'Sign up with Google'
  | 'Sign in with Google'
  | 'Try another Google account';

/**
 * The design system's Google button (docs/design-system/components/google-button.html, block
 * `google-button`): one `<button>` with the bundled full-colour G and Google's wording, a neutral
 * border and fill, at least 44 px tall (L2-049 AC9, AC10). While `busy` (the page is leaving for
 * Google) it reads "Opening Google…" with the spinner, is `disabled` and `aria-busy="true"`
 * (L2-003 AC7, L2-004 AC7). A press emits `chosen`; the page starts the sign-in.
 */
@Component({
  selector: 'cf-google-button',
  imports: [GoogleMark],
  templateUrl: './google-button.html',
  styleUrl: './google-button.scss',
})
export class GoogleButton {
  readonly label = input<GoogleButtonLabel>('Continue with Google');
  readonly busy = input(false, { transform: booleanAttribute });

  readonly chosen = output<void>();
}
