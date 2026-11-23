import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import type { MemberDestination, MemberDestinationKey } from '../top-bar/member-destination';

/**
 * The design system's tab bar (docs/design-system/components/tab-bar.html): the mobile half of the
 * member app's primary navigation, a `nav` labelled "Primary, mobile" fixed to the bottom below
 * 768 px and hidden from there. Each destination is a link, a 24 px icon over its one-word label,
 * the full column wide and 64 px tall; the current one is marked `aria-current="page"` (L2-008
 * AC1, AC2). Unread messages put a dot on Messages that is hidden from assistive technology, with
 * the hidden words ", 4 unread" so the link reads "Messages, 4 unread" (L2-008 AC3). It is not a
 * tablist: arrow keys do nothing special. A plain click emits `navigate` with the link's `href`; a
 * modified click is the browser's. With no destinations there is no bar. Pages reserve
 * `--layout-tabbar-height` at the bottom so nothing hides behind it.
 */
@Component({
  selector: 'cf-tab-bar',
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.scss',
})
export class TabBar {
  readonly destinations = input<readonly MemberDestination[]>([]);
  /** The place showing; none on a screen outside them. */
  readonly current = input<MemberDestinationKey | null>(null);
  /** Unread messages; the dot shows above zero. */
  readonly unread = input(0);

  /** A plain click on a link, with its `href`. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
