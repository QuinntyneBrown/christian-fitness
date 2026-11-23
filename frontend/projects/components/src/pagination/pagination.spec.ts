import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';
import { paginationItems } from './pagination-items';

describe('paginationItems', () => {
  // First, last, the current page and its neighbours, with a gap for what is skipped; a gap of one
  // page shows that page instead. Seven pages or fewer show them all.
  it.each<[number, number, (number | 'gap')[]]>([
    [1, 1, [1]],
    [3, 5, [1, 2, 3, 4, 5]],
    [4, 7, [1, 2, 3, 4, 5, 6, 7]],
    [2, 8, [1, 2, 3, 'gap', 8]],
    [1, 8, [1, 2, 'gap', 8]],
    [4, 8, [1, 2, 3, 4, 5, 'gap', 8]],
    [5, 12, [1, 'gap', 4, 5, 6, 'gap', 12]],
    [8, 8, [1, 'gap', 7, 8]],
  ])('page %i of %i shows %j', (page, count, expected) => {
    expect(paginationItems(page, count)).toEqual(expected);
  });
});

async function render(page: number, count: number) {
  const fixture = TestBed.createComponent(Pagination);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('pageCount', count);
  fixture.componentRef.setInput('summary', 'Showing 21–40 of 154 members');
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const pages: number[] = [];
  fixture.componentInstance.navigate.subscribe((p) => pages.push(p));
  return { el, pages };
}

describe('Pagination', () => {
  it('is a navigation landmark marking the current page, with every page a link', async () => {
    const { el } = await render(2, 8);

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
    const current = el.querySelector('[aria-current="page"]') as HTMLAnchorElement;
    expect(current.getAttribute('aria-label')).toBe('Page 2');
    expect(current.getAttribute('href')).toBe('?page=2');
    expect(el.querySelector('.pagination__gap')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.pagination__page-only')?.textContent).toBe('Page 2 of 8');
  });

  // The unavailable end stays visible without an address (pagination.html, "States").
  it.each<[number, string, string | null, string | null]>([
    [1, 'Previous page', null, 'true'],
    [8, 'Next page', null, 'true'],
    [2, 'Previous page', '?page=1', null],
    [7, 'Next page', '?page=8', null],
  ])(
    'on page %i of 8, "%s" has href %s and aria-disabled %s',
    async (page, name, href, disabled) => {
      const { el } = await render(page, 8);

      const end = el.querySelector(`[aria-label="${name}"]`) as HTMLAnchorElement;
      expect(end.getAttribute('href')).toBe(href);
      expect(end.getAttribute('aria-disabled')).toBe(disabled);
    },
  );

  it('hands a plain click to the screen with the page, and leaves a modified click to the browser', async () => {
    const { el, pages } = await render(2, 8);
    const link = el.querySelector('[aria-label="Page 3"]') as HTMLAnchorElement;

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    const newTab = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(newTab);

    expect(pages).toEqual([3]);
    expect(plain.defaultPrevented).toBe(true);
    expect(newTab.defaultPrevented).toBe(false);
  });
});
