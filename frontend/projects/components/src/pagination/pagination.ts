import { Component, computed, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { paginationItems } from './pagination-items';

/**
 * The design system's pagination (docs/design-system/components/pagination.html): a
 * `<nav aria-label="Pagination">` with an optional range summary and an ordered list of links,
 * each page a URL (`?page=3` by default, or `hrefFor`) so Back and sharing work. The current page
 * is `aria-current="page"`; an unavailable end stays visible with `aria-disabled` and no address,
 * so Tab skips it. Below 640 px the numbers give way to "Page 2 of 8". A plain click (the main
 * button, no modifier key) is not followed but emits `navigate` with the page, so the app moves
 * without reloading and then moves focus to the table's caption.
 */
@Component({
  selector: 'cf-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageCount = input.required<number>();
  /** Such as "Showing 21–40 of 154 members". */
  readonly summary = input<string>();
  readonly hrefFor = input<(page: number) => string>((page) => `?page=${page}`);

  readonly navigate = output<number>();

  protected readonly items = computed(() => paginationItems(this.page(), this.pageCount()));

  protected follow(event: MouseEvent, page: number): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(page);
  }
}
