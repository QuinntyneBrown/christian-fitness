import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The member app's header (docs/design-system/assets/components.css, "app-header"; mock
 * `docs/mocks/pages/home/`): the lockup linking to `homeHref` and, at its end, a ghost Sign out
 * button 44 px tall at every viewport (L2-008 AC4). Choosing it emits `signOut`; with
 * `signingOut` the button is disabled and busy. The destinations and the profile avatar join it
 * with the screens they open (ADR 0009).
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
}
