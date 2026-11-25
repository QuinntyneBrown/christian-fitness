import { booleanAttribute, Component, input, output } from '@angular/core';
import { UnreadDot } from '../badge/unread-dot';
import { isPlainClick } from '../link/plain-click';

/** The kind's icon (docs/design-system/components/notification-row.html, "Overview"). */
export type NotificationIcon = 'clock' | 'calendar-x' | 'calendar-plus';

/**
 * The design system's notification row (docs/design-system/components/notification-row.html): one
 * entry of the member's inbox, a link to what it is about with the kind's icon, the title, a line of
 * detail and when it came. Unread (`note--unread`), the title is bold and the unread dot shows,
 * named "Unread" for assistive technology, so weight and colour are not the only carriers. Every text
 * is rendered as text. A plain click emits `navigate` with its `href`; a modified click is the
 * browser's.
 */
@Component({
  selector: 'cf-notification-row',
  imports: [UnreadDot],
  templateUrl: './notification-row.html',
  styleUrl: './notification-row.scss',
})
export class NotificationRow {
  readonly href = input.required<string>();
  readonly icon = input<NotificationIcon>('clock');
  readonly heading = input.required<string>();
  readonly text = input('');
  /** When it came, as the row says it ("2 hours ago", "Yesterday", "Apr 12"). */
  readonly time = input('');
  readonly unread = input(false, { transform: booleanAttribute });

  /** A plain click, with the row's `href`. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
