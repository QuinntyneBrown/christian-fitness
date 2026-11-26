import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * One link of the admin navigation: which area (its icon), its label and where it goes, the group
 * it sits in, and, where work waits for staff, how much and what it is, read in full ("3
 * applications waiting").
 */
export interface AdminNavItem {
  key:
    | 'dashboard'
    | 'stories'
    | 'newsletter'
    | 'events'
    | 'series'
    | 'community-pick'
    | 'listings'
    | 'services'
    | 'members';
  label: string;
  href: string;
  /** The group's name ("Gather"); none for the Dashboard, which stands alone. */
  group?: string | null;
  /** Work waiting in the area; no count shows at zero or without one. */
  count?: number;
  /** The count in words, its accessible name, such as "3 applications waiting". */
  countLabel?: string;
}

/** One list of links, and the heading that labels it when it has one. */
interface NavSection {
  group: string | null;
  /** The heading's id, which labels its list. */
  headingId: string | null;
  items: readonly AdminNavItem[];
}

/**
 * The design system's `admin-nav` block (docs/design-system/components/sidebar-navigation.html):
 * one link per area with its icon, the `current` one marked `aria-current="page"` (L2-021 AC1),
 * and an `admin-nav__count` pill, named by its `countLabel`, where work waits (none at zero).
 * With `showGroups` (an Admin's navigation, ADR 0079) consecutive items of one group sit in a list
 * labelled by the group's `h2.admin-nav__group`, and items with no group in an unlabelled list;
 * without it every item sits in one unlabelled list. Below LG the headings are hidden and the
 * lists run on in one row. Each is a real link, so it can be opened in a new tab; a plain click
 * (the main button, no modifier key) is not followed but emits `navigate` with the link's `href`,
 * so the app moves without reloading. Labels are rendered as text.
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
  /** Heads each group with its name (an Admin's); otherwise one list without names. */
  readonly showGroups = input(false, { transform: booleanAttribute });

  /** A plain click on a link, with its `href`. */
  readonly navigate = output<string>();

  protected readonly sections = computed<readonly NavSection[]>(() => {
    const items = this.items();
    if (!this.showGroups()) return [{ group: null, headingId: null, items }];
    const sections: { group: string | null; headingId: string | null; items: AdminNavItem[] }[] =
      [];
    for (const item of items) {
      const group = item.group ?? null;
      const last = sections.at(-1);
      if (last && last.group === group) last.items.push(item);
      else
        sections.push({
          group,
          headingId:
            group === null ? null : `admin-nav-${group.toLowerCase().replace(/\W+/g, '-')}`,
          items: [item],
        });
    }
    return sections;
  });

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
