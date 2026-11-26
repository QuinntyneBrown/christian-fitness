import { Component, input, output } from '@angular/core';
import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Button } from '../button/button';
import { isPlainClick } from '../link/plain-click';

/** One link of the masthead's section navigation. */
export interface MastheadSection {
  label: string;
  href: string;
  current: boolean;
}

/**
 * The design system's masthead (docs/design-system/components/masthead.html, blocks `masthead`
 * and `section-nav`): the header of the public news pages. The bar holds the lockup, "Sign in"
 * (hidden below 640 px) and "Join free"; with `sections` it adds the section navigation, whose
 * current link carries `aria-current="page"`. It stays at the top while the page scrolls, and the
 * sections scroll sideways inside it. A plain click on a section emits `navigate` with its
 * address, so the screen routes without a reload; any other click stays the browser's.
 */
@Component({
  selector: 'cf-masthead',
  imports: [BrandLockup, Button],
  templateUrl: './masthead.html',
  styleUrl: './masthead.scss',
})
export class Masthead {
  readonly homeHref = input('/');
  readonly signInHref = input('/sign-in');
  readonly joinHref = input('/join');
  readonly sections = input<readonly MastheadSection[]>([]);
  /** Names the section navigation for assistive technology. */
  readonly sectionsLabel = input('Sections');

  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
