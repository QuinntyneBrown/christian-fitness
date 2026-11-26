import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
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

/** The panel's one button: its words, and whether it is disabled or busy. */
export interface SeriesPanelButton {
  label: string;
  disabled: boolean;
  busy: boolean;
}

/**
 * The design system's series panel (docs/design-system/components/series-card.html, "Series
 * panel", block `series-panel` in a `card--pad-sm`; ADR 0099): "Sign up" with the spots left, the
 * ways to come as plan options in one radio group, "How would you like to come?", the one button,
 * a generic failure above it (`role="alert"`) and the chat note; or, once `joined`, "You're in
 * for every session" as a status and how to pay. Words are rendered as text. It emits the way
 * chosen and the button's press; the page decides what they do.
 */
@Component({
  selector: 'cf-series-panel',
  imports: [Button, PlanList, PlanOption],
  templateUrl: './series-panel.html',
  styleUrl: './series-panel.scss',
})
export class SeriesPanel {
  readonly joined = input(false, { transform: booleanAttribute });
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
  /** The value of the way the member chose. */
  readonly choose = output<string>();
  /** The member pressed the button. */
  readonly act = output<void>();
}
