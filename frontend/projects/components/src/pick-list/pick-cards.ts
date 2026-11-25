import { booleanAttribute, Component, input, output } from '@angular/core';

/** One pick card: what it chooses, its title and its meta line. */
export interface PickCardItem {
  id: string;
  title: string;
  /** "Organization · Listed", or "Every Tuesday · 6:30 PM". */
  meta: string;
}

/**
 * The design system's pick cards (docs/design-system/components/pick-list.html, blocks
 * `pick-cards` and `pick-card`), in the form that chooses a value inside a form (ADR 0089): a list
 * named by `label`, each card a `button` with its title and meta, which emits `picked` with the
 * card's id. `stack` keeps the cards stacked at every width, as the event editor's Host picker
 * does. Titles and meta are rendered as text. The link form, which chooses the record a page shows,
 * joins with the admin series and listing pages.
 */
@Component({
  selector: 'cf-pick-cards',
  templateUrl: './pick-cards.html',
  styleUrl: './pick-cards.scss',
})
export class PickCards {
  readonly label = input.required<string>();
  readonly items = input.required<readonly PickCardItem[]>();
  readonly stack = input(false, { transform: booleanAttribute });
  readonly picked = output<string>();
}
