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

  it('draws a person cell as initials hidden from assistive technology beside the name and a muted second line', async () => {
    const { el } = await render({
      columns: [{ key: 'member', label: 'Member', kind: 'person' }],
      rows: [
        {
          id: 'gt',
          name: 'Grace Thompson',
          cells: { member: { text: 'Grace Thompson', sub: 'grace.thompson@gmail.com' } },
        },
      ],
    });

    const person = el.querySelector('tbody td .table__person') as HTMLElement;
    const avatar = person.querySelector('.avatar') as HTMLElement;
    expect(avatar.textContent?.trim()).toBe('GT');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
    expect(person.querySelector('.table__strong')?.textContent).toBe('Grace Thompson');
    expect(person.querySelector('.table__sub')?.textContent).toBe('grace.thompson@gmail.com');
  });

  it('renders a person cell as text', async () => {
    const { el } = await render({
      columns: [{ key: 'member', label: 'Member', kind: 'person' }],
      rows: [
        { id: 'x', name: 'x', cells: { member: { text: '<b>Grace</b>', sub: '<i>g@x</i>' } } },
      ],
    });

    expect(el.querySelector('.table__strong')?.textContent).toBe('<b>Grace</b>');
    expect(el.querySelector('.table__sub')?.textContent).toBe('<i>g@x</i>');
    expect(el.querySelector('tbody b, tbody i')).toBeNull();
  });

  it('says what an empty cell means in words, beside a dash assistive technology skips', async () => {
    const { el } = await render({
      actionLabel: undefined,
      columns: [{ key: 'church', label: 'Church', kind: 'muted', empty: 'Not given' }],
      rows: [
        { id: 'kb', name: 'Kevin Brooks', cells: { church: { text: '' } } },
        { id: 'ts', name: 'Tyler Simmons', cells: {} },
        { id: 'gt', name: 'Grace Thompson', cells: { church: { text: 'Grace Fellowship' } } },
      ],
    });

    const cells = Array.from(el.querySelectorAll('tbody td'));
    for (const cell of cells.slice(0, 2)) {
      expect(cell.querySelector('[aria-hidden="true"]')?.textContent).toBe('—');
      expect(cell.querySelector('.visually-hidden')?.textContent).toBe('Not given');
    }
    expect(cells[2]?.textContent?.trim()).toBe('Grace Fellowship');
    expect(cells[2]?.querySelector('.visually-hidden')).toBeNull();
    expect(cells.map((cell) => cell.className)).toEqual(['muted', 'muted', 'muted']);
  });

  it('leaves an empty cell blank when its column has no words for it', async () => {
    const { el } = await render({
      columns: [{ key: 'date', label: 'Date', kind: 'nowrap' }],
      rows: [{ id: 'x', name: 'x', cells: {} }],
    });

    expect(el.querySelector('tbody td')?.textContent?.trim()).toBe('');
  });

  it('renders cells as text', async () => {
    const { el } = await render({
      rows: [{ id: 'x', name: '<b>x</b>', cells: { event: { text: '<b>x</b>' } } }],
    });

    expect(el.querySelector('.table__strong')?.textContent).toBe('<b>x</b>');
    expect(el.querySelector('tbody b')).toBeNull();
  });
});
