import { booleanAttribute, Component, input, output } from '@angular/core';
import { AdminNav, type AdminNavItem } from '../admin-nav/admin-nav';
import { AdminUser } from '../admin-user/admin-user';

/**
 * The design system's `admin` block (docs/design-system/components/sidebar-navigation.html; mock
 * `docs/mocks/pages/admin-dashboard/`): the sidebar with the brand, the navigation (`AdminNav`)
 * and the signed-in staff member (`AdminUser`) with a Sign out button, and the page's
 * one `main`, where the routed screen is projected. From LG the sidebar is a sticky column; below
 * it, a band: the brand and Sign out on one row, the links in a row under them (L2-021). Choosing
 * Sign out emits `signOut`; with `signingOut` the button is disabled and busy. A plain click on a
 * link emits `navigate` with its `href`. Every text is rendered as text.
 */
@Component({
  selector: 'cf-admin-layout',
  imports: [AdminNav, AdminUser],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  readonly items = input.required<readonly AdminNavItem[]>();
  /** The key of the area showing; none outside the areas. */
  readonly current = input<string | null>(null);
  readonly userName = input('');
  readonly userRole = input('');
  readonly userInitials = input('');
  readonly signingOut = input(false, { transform: booleanAttribute });

  readonly navigate = output<string>();
  readonly signOut = output();
}
