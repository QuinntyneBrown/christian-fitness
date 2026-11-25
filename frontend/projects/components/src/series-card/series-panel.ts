import { booleanAttribute, Component, input } from '@angular/core';

/** One way to come: "Every session (5 left)", its note and its price. */
export interface SeriesPanelPlan {
  title: string;
  note: string;
  price: string;
}

/**
 * The design system's series panel (docs/design-system/components/series-card.html, "Series
 * panel", block `series-panel` in a `card--pad-sm`), in its read-only form until joining comes
 * (ADR 0096): "Sign up" with the spots left, the ways to come in the plan options' look with no
 * radio and no button, and the note; or, once `joined`, "You're in for every session" as a
 * status. Words are rendered as text.
 */
@Component({
  selector: 'cf-series-panel',
  templateUrl: './series-panel.html',
  styleUrl: './series-panel.scss',
})
export class SeriesPanel {
  readonly joined = input(false, { transform: booleanAttribute });
  /** "12 of 50 spots left", "Series full" or "No sessions left". */
  readonly spots = input('');
  readonly plans = input<readonly SeriesPanelPlan[]>([]);
  /** "One group chat for the whole series." */
  readonly note = input('');
}
