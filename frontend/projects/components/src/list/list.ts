import { NgTemplateOutlet } from '@angular/common';
import { Component, input, type TemplateRef } from '@angular/core';

/**
 * The design system's hairline-separated lists (list.html, "Overview"): `ruled` adds top and bottom
 * rules, `divided` only rules between, `mini` spaces compact person rows, `card` is the list card
 * (card.html, `card card--list`) and `goals` the profile's larger static lines.
 */
export type ListVariant = 'ruled' | 'divided' | 'mini' | 'card' | 'goals';

/** One item of a list; its `id` keeps the row while the list changes. */
export interface ListItem {
  id: string | number;
}

/**
 * The design system's list (docs/design-system/components/list.html): a `<ul>` of `<li>`, each
 * holding what `template` renders for its item, usually one link that wraps the whole row
 * (`cf-event-row`, `cf-mini-row`). The list draws its own items' rules, so a screen only says
 * what each row is. A list that is not a section of its own takes a `label`. The screen bounds
 * what it passes (a window or a page), never the list.
 */
@Component({
  selector: 'cf-list',
  imports: [NgTemplateOutlet],
  templateUrl: './list.html',
  styleUrl: './list.scss',
})
export class List<T extends ListItem = ListItem> {
  readonly variant = input<ListVariant>('ruled');
  readonly items = input.required<readonly T[]>();
  readonly template = input.required<TemplateRef<{ $implicit: T }>>();
  readonly label = input<string>();

  protected classes(): string {
    const variant = this.variant();
    if (variant === 'card') {
      return 'card card--list';
    }
    return variant === 'mini' ? 'mini-list' : variant === 'goals' ? 'goals' : `list-${variant}`;
  }
}
