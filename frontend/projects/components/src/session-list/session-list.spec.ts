import { TestBed } from '@angular/core/testing';
import { SessionList, type SessionListRow } from './session-list';

const row = (over: Partial<SessionListRow>): SessionListRow => ({
  id: 's3',
  month: 'Apr',
  day: '21',
  meta: 'Session 3 · Tue',
  date: ', Apr 21',
  state: 'upcoming',
  topic: 'Same intervals, six times through',
  end: null,
  ...over,
});

async function render(sessions: SessionListRow[]) {
  const fixture = TestBed.createComponent(SessionList);
  fixture.componentRef.setInput('sessions', sessions);
  const emitted: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, emitted };
}

function click(link: HTMLAnchorElement, init: MouseEventInit = {}): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  link.dispatchEvent(event);
  return event.defaultPrevented;
}

// L2-051 AC2, AC4, AC5 (ADR 0096): a series' dates as an ordered list.
describe('SessionList', () => {
  it('marks each state with its modifier and says it in words, with the date tile hidden', async () => {
    const { root } = await render([
      row({ id: 'a', state: 'past', end: { kind: 'status', text: 'Done' } }),
      row({ id: 'b', state: 'next' }),
      row({ id: 'c', state: 'cancelled', end: { kind: 'status', text: 'Cancelled' } }),
      row({ id: 'd' }),
    ]);
    const rows = Array.from(root.querySelectorAll('ol.session-list > li'));

    expect(rows.map((li) => li.getAttribute('class'))).toEqual([
      'session-row session-row--past',
      'session-row session-row--next',
      'session-row session-row--cancelled',
      'session-row',
    ]);
    expect(rows[1]?.querySelector('.session-row__meta')?.textContent?.trim()).toBe(
      'Session 3 · Tue, Apr 21 · Next up',
    );
    expect(rows[0]?.querySelector('.session-row__meta')?.textContent).not.toContain('Next up');
    expect(rows[2]?.querySelector('.session-row__status')?.textContent).toBe('Cancelled');
    expect(rows[0]?.querySelector('.session-row__date')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('says "You came" with a decorative tick where staff recorded that the member came', async () => {
    const { root } = await render([row({ state: 'past', end: { kind: 'came' } })]);
    const came = root.querySelector('.session-row__end .session-row__came');

    expect(came?.textContent?.trim()).toBe('You came');
    expect(came?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a topic as text', async () => {
    const { root } = await render([row({ topic: '<b>Hills</b>' })]);

    expect(root.querySelector('.session-row__topic')?.textContent).toBe('<b>Hills</b>');
    expect(root.querySelector('.session-row__topic b')).toBeNull();
  });

  it('hands a plain click on Details to the screen and leaves a modified one to the browser', async () => {
    const { root, emitted } = await render([
      row({ end: { kind: 'details', href: '/events/s3', number: 3 } }),
    ]);
    const link = root.querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/events/s3');
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe('Details of session 3');
    expect(click(link)).toBe(true);
    expect(click(link, { ctrlKey: true })).toBe(false);
    expect(emitted).toEqual(['/events/s3']);
  });
});
