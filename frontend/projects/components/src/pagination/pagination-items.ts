/** A page number to link to, or a gap standing for the pages skipped. */
export type PaginationItem = number | 'gap';

/** Up to this many pages, every page is shown. */
const showAll = 7;

/**
 * The pages a pagination row shows (docs/design-system/components/pagination.html): every page
 * when there are seven or fewer; otherwise the first, the last, the current page and its
 * neighbours, with a gap for each run skipped. A gap that would stand for one page shows that page
 * instead, so "1 … 3" never appears.
 */
export function paginationItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= showAll) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const wanted = [1, page - 1, page, page + 1, pageCount].filter((p) => p >= 1 && p <= pageCount);
  const pages = [...new Set(wanted)].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  let previous = 0;
  for (const p of pages) {
    if (p - previous === 2) {
      items.push(p - 1);
    } else if (p - previous > 2) {
      items.push('gap');
    }
    items.push(p);
    previous = p;
  }
  return items;
}
