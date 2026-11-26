import { Component, computed, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { GoogleMark } from '../google-button/google-mark';

/**
 * The design system's sign-in account (docs/design-system/components/sso-notice.html, "Account",
 * block `sso-account`): on Join after Google, the account the profile will be made with, in place
 * of the email and password fields (L2-003 AC8). The avatar's initial, the email, "Signing in with
 * Google" after the G, and "Change", a link back to the email form at `changeHref`; pressing it
 * emits `changeChosen` and stays on the page, so the screen forgets the Google account first. The
 * email is rendered as text.
 */
@Component({
  selector: 'cf-sso-account',
  imports: [Avatar, GoogleMark],
  templateUrl: './sso-account.html',
  styleUrl: './sso-account.scss',
})
export class SsoAccount {
  readonly email = input.required<string>();
  /** The account's name, whose first letter the avatar shows; the email's when there is none. */
  readonly name = input<string | null>();
  readonly changeHref = input('/join');

  readonly changeChosen = output<void>();

  protected readonly initial = computed(() =>
    ((this.name() ?? '').trim() || this.email()).charAt(0).toUpperCase(),
  );

  protected change(event: Event): void {
    event.preventDefault();
    this.changeChosen.emit();
  }
}
