import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { CountBadge } from '../badge/count-badge';
import { UnreadDot } from '../badge/unread-dot';

/**
 * The design system's compact person row (docs/design-system/components/list.html, "Mini row"
 * and "Conversation"): one link that wraps the avatar (projected through `[slot=avatar]`, a
 * decorative `cf-avatar`), the name, the time and the last line. As a `conversation` (the inbox),
 * the open one is `current` (`aria-current="true"`). Unread is bold text plus a signal read in
 * words ("3 unread"), so weight is never the only signal: `cf-unread-dot` on a person row and the
 * `cf-count-badge` pill on a conversation. A `routed` row hands a plain click to the screen as
 * `navigate` with its address, so the screen can route; any other click, and every click on a row
 * that is not `routed`, is the browser's. Words are rendered as text.
 */
@Component({
  selector: 'cf-mini-row',
  imports: [CountBadge, UnreadDot],
  templateUrl: './mini-row.html',
  styleUrl: './mini-row.scss',
})
export class MiniRow {
  readonly href = input.required<string>();
  readonly name = input.required<string>();
  readonly time = input<string>();
  /** The last line, such as "Michael: Parking at Marilyn Bell fills up by 6:30". */
  readonly text = input<string>();
  /** A line under the name: an event group's member count, such as "18 members". */
  readonly meta = input<string>();
  readonly unread = input(0);
  /** The inbox's row, with its larger padding and current state. */
  readonly conversation = input(false, { transform: booleanAttribute });
  /** The conversation open beside the list. */
  readonly current = input(false, { transform: booleanAttribute });
  /** The screen routes a plain click itself, through `navigate`. */
  readonly routed = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!this.routed() || !isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
