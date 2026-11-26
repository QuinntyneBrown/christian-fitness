import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { ButtonRow } from '../button/button-row';
import { SessionMeter, type SessionMeterBar } from '../session-list/session-meter';
import { PlanList } from '../plan-option/plan-list';
import { PlanOption } from '../plan-option/plan-option';

/** One way to come: "Every session (5 left)", its note, price, and whether chosen or choosable. */
export interface SeriesPanelPlan {
  value: string;
  title: string;
  note: string;
  price: string;
  checked: boolean;
  disabled: boolean;
}

/** "Your progress": the count, the decorative meter's bars and its hidden label. */
export interface SeriesPanelProgress {
  count: string;
  bars: readonly SessionMeterBar[];
  label: string;
}

/** The panel's one button: its words, and whether it is disabled or busy. */
export interface SeriesPanelButton {
  label: string;
  disabled: boolean;
  busy: boolean;
}

/**
 * The design system's series panel (docs/design-system/components/series-card.html, "Series
 * panel", block `series-panel` in a `card--pad-sm`; ADR 0101): "Sign up" with the spots left, the
 * ways to come as plan options in one radio group, "How would you like to come?", the one button,
 * a generic failure above it (`role="alert"`) and the chat note; or, once `joined`, "You're in
 * for every session" as a status, how to pay, the dates already booked that keep their price,
 * "Your progress" with its session meter, "All dates", "Group chat" and "Leave the series". Words
 * are rendered as text. It emits the way chosen, the button's press, All dates and Leave; the
 * page decides what they do.
 */
@Component({
  selector: 'cf-series-panel',
  imports: [Button, ButtonRow, PlanList, PlanOption, SessionMeter],
  templateUrl: './series-panel.html',
  styleUrl: './series-panel.scss',
})
export class SeriesPanel {
  readonly joined = input(false, { transform: booleanAttribute });
  /** Once joined: "You're in for every session" or "You're in for 4 of 5 sessions to come". */
  readonly confirmed = input('');
  /** "Pay the host at your first session, …" under the confirmation; none for a free series. */
  readonly payNote = input<string | null>(null);
  /** "12 of 50 spots left", "Series full" or "No sessions left". */
  readonly spots = input('');
  readonly plans = input<readonly SeriesPanelPlan[]>([]);
  /** None when no way to come can be chosen. */
  readonly button = input<SeriesPanelButton | null>(null);
  /** The last join failed: "We couldn't sign you up. Try again in a moment." */
  readonly failed = input(false, { transform: booleanAttribute });
  /** "One group chat for the whole series." */
  readonly note = input('');
  /** "You'd already booked session 4, …" right after a join; else none. */
  readonly keptNote = input<string | null>(null);
  /** Once joined; else none. */
  readonly progress = input<SeriesPanelProgress | null>(null);
  /** The series' group chat. */
  readonly chatHref = input('');
  /**
   * Once a member who has not joined holds dates (ADR 0102): "Registered for 2 dates" and
   * "Sessions 4, 6. You can add more dates any time. …", with "Change dates"; else none.
   */
  readonly booked = input<{ confirmed: string; note: string } | null>(null);
  /** Words for the failure above the button in place of the generic one, such as the dates that filled. */
  readonly failure = input<string | null>(null);
  /** The member chose "Change dates". */
  readonly changeDates = output<void>();
  /** While dates are changed: "Cancel" under the button, back to the dates held (ADR 0102). */
  readonly cancelable = input(false, { transform: booleanAttribute });
  /** The member chose "Cancel" while changing dates. */
  readonly cancelChange = output<void>();
  /** The member asked for the calendar file of every date to come. */
  readonly allDates = output<void>();
  /** The member chose "Leave the series". */
  readonly leave = output<void>();
  /** The value of the way the member chose. */
  readonly choose = output<string>();
  /** The member pressed the button. */
  readonly act = output<void>();
}
