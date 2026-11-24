import { booleanAttribute, Component, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The Services list row (mock `services/default`, block `service-row`): one link that wraps the
 * avatar (initials, decorative), the professional's name, a line of role and where, and the price
 * from 640 px up. The listing showing beside the list is `current` (`aria-current="true"`). A plain
 * click emits `navigate` with `href`; a modified click is the browser's. With `loading` it is the
 * same row of `cf-skeleton`s, for a `cf-skeleton-region` around the list to name. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-service-row',
  imports: [Avatar, Skeleton],
  templateUrl: './service-row.html',
  styleUrl: './service-row.scss',
})
export class ServiceRow {
  readonly href = input('');
  readonly name = input('');
  /** The role and where, such as "Registered dietitian · Virtual · Ontario-wide". */
  readonly text = input('');
  readonly price = input('');
  readonly current = input(false, { transform: booleanAttribute });
  /** The listing is still loading: skeletons in place of the avatar and the words. */
  readonly loading = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
