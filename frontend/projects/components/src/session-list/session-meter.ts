import { booleanAttribute, Component, input } from '@angular/core';

/** One bar: a session done, the next one, one still to come, or one cancelled. */
export type SessionMeterBar = 'done' | 'next' | 'upcoming' | 'cancelled';

/**
 * The design system's session meter (docs/design-system/components/session-list.html, block
 * `session-meter`): one bar a session in date order, filled when done, highlighted when next,
 * faded when cancelled. The bars are decorative; `label` ("2 of 7 sessions done") says the same
 * in visually hidden text, so the meter never relies on colour alone. `thick` draws the 8 px bars
 * of a joined member's series progress.
 */
@Component({
  selector: 'cf-session-meter',
  templateUrl: './session-meter.html',
  styleUrl: './session-meter.scss',
})
export class SessionMeter {
  readonly bars = input.required<readonly SessionMeterBar[]>();
  readonly label = input.required<string>();
  readonly thick = input(false, { transform: booleanAttribute });

  protected classOf(bar: SessionMeterBar): string {
    return bar === 'upcoming'
      ? 'session-meter__bar'
      : `session-meter__bar session-meter__bar--${bar}`;
  }
}
