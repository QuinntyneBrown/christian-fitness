import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { ListingMark } from '../listing-row/listing-mark';
import { VerifiedMark } from '../listing-row/verified-mark';

/**
 * The design system's host card (docs/design-system/components/host-card.html, block `host-card`):
 * who hosts an event, as one link to the host's listing with its mark, "Hosted by · <kind>" (or
 * "Hosted by" with no `kind`), the name and, when `verified`, the verified mark named "Verified",
 * and an arrow. The mark and the arrow are decorative. A plain click emits `navigate` with the
 * address, so the screen can route; any other click is the browser's. Words are rendered as text.
 */
@Component({
  selector: 'cf-host-card',
  imports: [ListingMark, VerifiedMark],
  templateUrl: './host-card.html',
  styleUrl: './host-card.scss',
})
export class HostCard {
  readonly href = input.required<string>();
  readonly name = input.required<string>();
  /** The kind's name on an event page, such as "Instructor"; none on a series page. */
  readonly kind = input('');
  readonly initials = input('');
  readonly photoSrc = input<string | null>(null);
  readonly person = input(false, { transform: booleanAttribute });
  readonly verified = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
