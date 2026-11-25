import { booleanAttribute, Component, input, output } from '@angular/core';
import { Seal } from '../brand-lockup/seal';
import { AdminNav, type AdminNavItem } from './admin-nav';
import { AdminUser } from './admin-user';

/**
 * The design system's sidebar navigation (docs/design-system/components/sidebar-navigation.html):
 * the admin console's `admin__sidebar`, with the brand (the light `cf-seal`, "Christian Fitness"
 * and the gold "Admin console"), the `admin-nav` links (`AdminNav`), each with its icon and, where
 * work waits, a count, and the signed-in staff member with Sign out (`AdminUser`). From LG it is a
 * sticky full-height column; below it, a band: the brand and Sign out on one row, the links in a
 * row under them that scrolls sideways within itself (L2-021). A plain click on a link emits
 * `navigate` with its `href`; Sign out emits `signOut`, and with `signingOut` it is disabled and
 * busy. Every text is rendered as text.
 */
@Component({
  selector: 'cf-sidebar-navigation',
  imports: [AdminNav, AdminUser, Seal],
  templateUrl: './sidebar-navigation.html',
  styleUrl: './sidebar-navigation.scss',
})
export class SidebarNavigation {
  readonly items = input.required<readonly AdminNavItem[]>();
  /** The key of the area showing; none outside the areas. */
  readonly current = input<string | null>(null);
  /** Heads each group of links with its name (an Admin's navigation, ADR 0079). */
  readonly showGroups = input(false, { transform: booleanAttribute });
  readonly userName = input('');
  readonly userRole = input('');
  readonly userInitials = input('');
  readonly signingOut = input(false, { transform: booleanAttribute });

  /** A plain click on a link, with its `href`. */
  readonly navigate = output<string>();
  readonly signOut = output();
}
