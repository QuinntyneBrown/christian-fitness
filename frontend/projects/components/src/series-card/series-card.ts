import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { isPlainClick } from '../link/plain-click';

let nextId = 0;

/** One date on the card: "Tue Apr 28" or "Tue May 12 · Cancelled", and its topic. */
export interface SeriesCardDate {
  id: string;
  when: string;
  topic: string;
  cancelled: boolean;
}

/**
 * The design system's series card (docs/design-system/components/series-card.html, block
 * `series-card`): a session's series on its event page (L2-010 AC5; ADR 0096), with the meta
 * ("Session 3 of 8 · Every Tuesday"), the title as a heading, one link to the series and the next
 * dates, a cancelled one's topic struck through and "Cancelled" in words. A plain click on the link
 * is handed to the screen through `navigate`; words are rendered as text.
 */
@Component({
  selector: 'cf-series-card',
  imports: [Button],
  templateUrl: './series-card.html',
  styleUrl: './series-card.scss',
})
export class SeriesCard {
  /** "Session 3 of 8 · Every Tuesday". */
  readonly meta = input('');
  readonly heading = input('');
  readonly href = input('');
  /** "View series" or "Join the series". */
  readonly action = input('');
  readonly dates = input<readonly SeriesCardDate[]>([]);
  /** The series page's address, on a plain click of the link. */
  readonly navigate = output<string>();

  protected readonly titleId = `cf-series-card-title-${nextId++}`;

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
