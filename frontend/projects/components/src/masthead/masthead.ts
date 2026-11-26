import { Component, input, output } from '@angular/core';
import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Button } from '../button/button';
import { isPlainClick } from '../link/plain-click';

/** One link of the masthead's section nav. */
export interface MastheadSection {
  label: string;
  href: string;
  /** The section showing: `aria-current="page"`. */
  current: boolean;
}

/**
 * The design system's masthead (docs/design-system/components/masthead.html; blocks `masthead`,
 * `section-nav`): the sticky header of a public news page. The bar holds the lockup, a ghost
 * "Sign in" (hidden below 640 px) and a primary "Join free"; with sections, the nav labelled
 * "Sections" lists them in order, the current one `aria-current="page"`, and scrolls sideways
 * inside itself on a phone (L2-001 AC1, L2-002 AC1, AC3). A plain click on a section emits
 * `navigate` with its address; any other click is the browser's. Every text is rendered as text.
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
  /** The sections, in order; none draws the bar alone (the story form). */
  readonly sections = input<readonly MastheadSection[]>([]);

  /** A plain click on a section, with its address. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
