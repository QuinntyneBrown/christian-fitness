import { Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * One link of the admin navigation: which area (its icon), its label and where it goes and, where
 * work waits for staff, how much and what it is, read in full ("3 applications waiting").
 */
export interface AdminNavItem {
  key: 'dashboard' | 'events' | 'services' | 'members';
  label: string;
  href: string;
  /** Work waiting in the area; no count shows at zero or without one. */
  count?: number;
  /** The count in words, its accessible name, such as "3 applications waiting". */
  countLabel?: string;
}

/**
 * The design system's `admin-nav` block (docs/design-system/components/sidebar-navigation.html):
 * one link per area with its icon, the `current` one marked `aria-current="page"` (L2-021 AC1),
 * and an `admin-nav__count` pill, named by its `countLabel`, where work waits (none at zero).
 * Each is a real link, so it can be opened in a new tab; a plain click (the main button, no
 * modifier key) is not followed but emits `navigate` with the link's `href`, so the app moves
 * without reloading. Labels are rendered as text.
 */
@Component({
  selector: 'cf-admin-nav',
  templateUrl: './admin-nav.html',
  styleUrl: './admin-nav.scss',
})
export class AdminNav {
  readonly items = input.required<readonly AdminNavItem[]>();
  /** The key of the area showing; none outside the areas. */
  readonly current = input<string | null>(null);

  /** A plain click on a link, with its `href`. */
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
