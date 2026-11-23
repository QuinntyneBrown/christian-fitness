import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The member app's header (docs/design-system/assets/components.css, "app-header"; mock
 * `docs/mocks/pages/home/`): the lockup linking to `homeHref` and, at its end, a ghost Sign out
 * button 44 px tall at every viewport (L2-008 AC4). Choosing it emits `signOut`; with
 * `signingOut` the button is disabled and busy. With `profileHref`, the profile avatar
 * (`profile-button`) precedes it: the member's initials, labelled "Your profile", marked
 * `aria-current="page"` with `profileCurrent` (ADR 0015). It is a real link; a plain click (the
 * main button, no modifier key) is not followed but emits `navigate` with its `href`, so the app
 * moves without reloading. The destinations join it with the screens they open (ADR 0009).
 */
@Component({
  selector: 'cf-app-header',
  imports: [Button],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss',
})
export class AppHeader {
  readonly homeHref = input.required<string>();
  readonly signingOut = input(false, { transform: booleanAttribute });
  readonly signOut = output();
  /** Where the profile avatar goes; without it, no avatar shows. */
  readonly profileHref = input<string>();
  /** The signed-in member's initials, shown in the avatar. */
  readonly profileInitials = input('');
  /** Profile is the screen showing. */
  readonly profileCurrent = input(false, { transform: booleanAttribute });
  /** A plain click on the profile avatar, with its `href`. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.navigate.emit(href);
  }
}
