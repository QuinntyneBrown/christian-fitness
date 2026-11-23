import { TestBed } from '@angular/core/testing';
import { Table, type TableColumn, type TableRow } from './table';

const columns: readonly TableColumn[] = [
  { key: 'event', label: 'Event', kind: 'primary' },
  { key: 'date', label: 'Date', kind: 'nowrap' },
  { key: 'registered', label: 'Registered', kind: 'num' },
];
const rows: readonly TableRow[] = [
  {
    id: 'sunrise',
    name: 'Easter Sunrise 5K',
    cells: {
      event: { text: 'Easter Sunrise 5K', sub: 'Marilyn Bell Park' },
      date: { text: 'Apr 18 · 6:45 AM' },
      registered: { text: '142 / 200' },
    },
  },
];

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Table);
  const all = { caption: 'Events', columns, rows, actionLabel: 'Edit', ...inputs };
  for (const [name, value] of Object.entries(all)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('Table', () => {
  it('is a native data table with a caption and column headers, in a scrollable region keyboard users can reach', async () => {
    const { el } = await render();

    const wrap = el.querySelector('.table-wrap') as HTMLElement;
    expect(wrap.getAttribute('role')).toBe('region');
    expect(wrap.getAttribute('aria-label')).toBe('Events');
    expect(wrap.tabIndex).toBe(0);
    expect(el.querySelector('caption')?.textContent?.trim()).toBe('Events');
    const headers = Array.from(el.querySelectorAll('th'));
    expect(headers.map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col']);
    expect(headers.map((th) => th.textContent?.trim())).toEqual([
      'Event',
      'Date',
      'Registered',
      'Actions',
    ]);
  });

  it('names each row action after its row and emits the row’s id', async () => {
    const { fixture, el } = await render();
    const acted: string[] = [];
    fixture.componentInstance.action.subscribe((id) => acted.push(id));

    const action = el.querySelector('.row-link') as HTMLButtonElement;
    expect(action.textContent?.replace(/\s+/g, ' ').trim()).toBe('Edit Easter Sunrise 5K');
    action.click();

    expect(acted).toEqual(['sunrise']);
  });

  it('while loading, keeps the header, draws skeleton rows and says it is busy', async () => {
    const { el } = await render({ loading: true, rows: [] });

    expect(el.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelectorAll('thead th')).toHaveLength(4);
    expect(el.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(3);
    expect(el.querySelector('tbody .skeleton')).not.toBeNull();
  });

  it('draws as many skeleton rows as the screen asks for while loading', async () => {
    const { el } = await render({ loading: true, rows: [], loadingRows: 5 });

    expect(el.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(el.querySelectorAll('tbody .skeleton')).toHaveLength(20);
  });

  it('reads a count cell as the count, then its total muted, on one line', async () => {
    const { el } = await render({
      columns: [{ key: 'registered', label: 'Registered', kind: 'count' }],
      rows: [{ id: 'r', name: 'Retreat', cells: { registered: { text: '0', of: '60' } } }],
    });

    const cell = el.querySelector('tbody td') as HTMLElement;
    expect(cell.className).toBe('table__nowrap');
    expect(cell.querySelector('.table__strong')?.textContent).toBe('0');
    expect(cell.querySelector('.muted')?.textContent).toBe(' / 60');
    expect(cell.textContent?.trim()).toBe('0 / 60');
  });

  it('renders cells as text', async () => {
    const { el } = await render({
      rows: [{ id: 'x', name: '<b>x</b>', cells: { event: { text: '<b>x</b>' } } }],
    });

    expect(el.querySelector('.table__strong')?.textContent).toBe('<b>x</b>');
    expect(el.querySelector('tbody b')).toBeNull();
  });
});
