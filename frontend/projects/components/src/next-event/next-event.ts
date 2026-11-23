import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The next-event card of Home (docs/design-system/assets/components.css, "Next event"; mock
 * `docs/mocks/pages/home/`): the event's picture linking to it with the pill over it ("You're
 * going · in 3 days"), then the when, the title as an `h2`, the place, and the actions projected
 * through `[slot=actions]` (Group chat, Details). With `loading` it holds `cf-skeleton`s of the
 * same boxes, for a `cf-skeleton-region` around it to name. Every value is rendered as text.
 */
@Component({
  selector: 'cf-next-event',
  imports: [Skeleton],
  templateUrl: './next-event.html',
  styleUrl: './next-event.scss',
})
export class NextEvent {
  /** Where the picture and the title lead: the event. */
  readonly href = input('');
  readonly imageSrc = input('');
  /** "You're going · in 3 days". */
  readonly pill = input('');
  /** "Sat, Apr 18 · 6:45 AM". */
  readonly when = input('');
  readonly heading = input('');
  readonly place = input('');
  /** The event is still loading: skeletons in place of the picture and the words. */
  readonly loading = input(false, { transform: booleanAttribute });
}
