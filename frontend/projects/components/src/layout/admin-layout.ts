import { booleanAttribute, Component, input, output } from '@angular/core';
import type { AdminNavItem } from '../sidebar-navigation/admin-nav';
import { SidebarNavigation } from '../sidebar-navigation/sidebar-navigation';
import { SkipLink } from '../skip-link/skip-link';

/**
 * The admin console's page shell, the design system's `admin` block (docs/design-system/
 * components/layout.html with sidebar-navigation.html; mock `docs/mocks/pages/admin-dashboard/`):
 * the skip link first, then the sidebar navigation (`cf-sidebar-navigation`) and the page's one
 * `main`, where the routed screen is projected, centred at `--layout-admin-max`. From LG the
 * sidebar is a sticky column beside the page; below it, a band above it (L2-021). The skip link
 * moves focus to the `main` (L2-038 AC2). A plain click on a link emits `navigate` with its
 * `href`; Sign out emits `signOut`, and with `signingOut` it is disabled and busy.
 */
@Component({
  selector: 'cf-admin-layout',
  imports: [SidebarNavigation, SkipLink],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  readonly items = input.required<readonly AdminNavItem[]>();
  /** The key of the area showing; none outside the areas. */
  readonly current = input<string | null>(null);
  /** Heads each group of links with its name (an Admin's navigation, ADR 0079). */
  readonly showGroups = input(false, { transform: booleanAttribute });
  readonly userName = input('');
  readonly userRole = input('');
  readonly userInitials = input('');
  readonly signingOut = input(false, { transform: booleanAttribute });
  /** The screen fills the page edge to edge, with no page padding: the story editor (ADR 0097). */
  readonly flush = input(false, { transform: booleanAttribute });

  readonly navigate = output<string>();
  readonly signOut = output();
}
