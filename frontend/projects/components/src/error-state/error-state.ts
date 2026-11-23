import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The design system's `error-state` (docs/design-system/assets/components.css, "Empty and error
 * states"; mock `docs/mocks/pages/profile/error.html`): a section that did not load, announced as
 * an alert, with what happened, **Try again**, which emits `retry` so the screen asks again in
 * place, and a link back to `backHref`. The heading and text are rendered as text.
 */
@Component({
  selector: 'cf-error-state',
  imports: [Button],
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly backHref = input.required<string>();
  readonly backLabel = input.required<string>();
  /** Try again was chosen. */
  readonly retry = output();
}
