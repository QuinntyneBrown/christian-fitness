import { Component, input, output } from '@angular/core';

/** One link of the admin navigation: which area (its icon), its label and where it goes. */
export interface AdminNavItem {
  key: 'dashboard' | 'events' | 'services' | 'members';
  label: string;
  href: string;
}

/**
 * The design system's `admin-nav` block (docs/design-system/components/sidebar-navigation.html):
 * one link per area with its icon, the `current` one marked `aria-current="page"` (L2-021 AC1).
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
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    this.navigate.emit(href);
  }
}
