import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * The design system's hosting row (docs/design-system/components/host-card.html, "Hosting", block
 * `hosting-row`): one series or one-off event a listing hosts, as one link with its picture, the
 * meta line (a `series` gets the repeat icon), the title and the sub line, and an arrow. The
 * picture is decorative, since the title follows. A plain click emits `navigate` with the address,
 * so the screen can route; any other click is the browser's. Words are rendered as text.
 */
@Component({
  selector: 'cf-hosting-row',
  templateUrl: './hosting-row.html',
  styleUrl: './hosting-row.scss',
})
export class HostingRow {
  readonly href = input.required<string>();
  readonly imageSrc = input.required<string>();
  /** "Run · Sat Apr 18", or "Series · Every Tuesday". */
  readonly meta = input.required<string>();
  readonly heading = input.required<string>();
  /** "6:45 AM · Martin Goodman Trail", or "Next: Tue Apr 21, 6:30 PM · 5 sessions left". */
  readonly sub = input.required<string>();
  readonly series = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
