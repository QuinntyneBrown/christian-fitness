import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/** The bell's pill (ADR 0068): nothing at zero, the count to nine, then "9+". */
export function bellBadge(unread: number): string {
  if (!(unread > 0)) return '';
  return unread > 9 ? '9+' : String(Math.floor(unread));
}

/** The bell's accessible name: "Notifications", or "Notifications, 12 unread" with any unread. */
export function bellLabel(unread: number): string {
  return unread > 0 ? `Notifications, ${Math.floor(unread)} unread` : 'Notifications';
}

/**
 * The design system's bell (docs/design-system/components/bell.html): a 44 × 44 px link to the
 * Notifications screen in the member top bar. With nothing unread it is the icon alone; otherwise a
 * pill shows the count to nine, then "9+". The accessible name carries the exact number
 * ("Notifications, 12 unread") and the pill is `aria-hidden`, so colour is not the only carrier.
 * `current` marks it `aria-current="page"`. A plain click emits `navigate` with its `href`.
 */
@Component({
  selector: 'cf-bell',
  templateUrl: './bell.html',
  styleUrl: './bell.scss',
})
export class Bell {
  readonly href = input.required<string>();
  /** Unread notifications; zero, or unknown, shows no pill. */
  readonly count = input(0);
  readonly current = input(false, { transform: booleanAttribute });

  /** A plain click, with the bell's `href`. */
  readonly navigate = output<string>();

  protected readonly badge = computed(() => bellBadge(this.count()));
  protected readonly label = computed(() => bellLabel(this.count()));

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
