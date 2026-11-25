import { booleanAttribute, Component, input, output } from '@angular/core';
import { Tag } from '../chip/tag';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';
import { SessionMeter, type SessionMeterBar } from '../session-list/session-meter';

/**
 * The design system's series row (docs/design-system/components/series-card.html, block
 * `series-row`, inside the list card `series-list`): one link wrapping the photo (decorative),
 * the cadence and time, the title (an `h2`), host, area and date range, the session meter with its
 * hidden "<done> of <total> sessions done", and an end that reads "Joined" (a small tag) or the
 * price, then "Next <date>". Stacked on phones; from 640 px photo, body and end sit in a row. A
 * plain click emits `navigate` for the app's router. With `loading` it is the same row of
 * skeletons. Words are rendered as text.
 */
@Component({
  selector: 'cf-series-row',
  imports: [SessionMeter, Skeleton, Tag],
  templateUrl: './series-row.html',
  styleUrl: './series-row.scss',
})
export class SeriesRow {
  readonly href = input('');
  readonly imageSrc = input('');
  /** "Every Tuesday · 6:30 PM". */
  readonly meta = input('');
  readonly heading = input('');
  /** "Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26". */
  readonly sub = input('');
  readonly bars = input<readonly SessionMeterBar[]>([]);
  /** "2 of 7 sessions done". */
  readonly done = input('');
  readonly joined = input(false, { transform: booleanAttribute });
  /** "Free" or "$64 for all 8"; shown when not joined. */
  readonly price = input('');
  /** "Next Apr 21". */
  readonly next = input('');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
