import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, type TemplateRef } from '@angular/core';

/** One item of the grid; its `id` keeps its card while the list grows. */
export interface EventGridItem {
  id: string;
}

/**
 * The design system's event grid (docs/design-system/components/event-card.html, "Layout",
 * `.event-grid`): a `<ul>` of cards, one column on phones and two from the small breakpoint, the
 * cards of a row the same height. Each `<li>` holds what `template` renders for its item, one
 * `cf-event-card`. The screen bounds what it passes (a window or a page), never the grid.
 */
@Component({
  selector: 'cf-event-grid',
  imports: [NgTemplateOutlet],
  templateUrl: './event-grid.html',
  styleUrl: './event-grid.scss',
})
export class EventGrid<T extends EventGridItem = EventGridItem> {
  readonly items = input.required<readonly T[]>();
  readonly template = input.required<TemplateRef<{ $implicit: T }>>();

  /** Each item as its card's template context, made once per list rather than on every check. */
  protected readonly rows = computed(() => this.items().map((item) => ({ $implicit: item })));
}
