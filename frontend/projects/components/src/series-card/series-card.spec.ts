import { TestBed } from '@angular/core/testing';
import { SeriesCard, type SeriesCardDate } from './series-card';

async function render(dates: SeriesCardDate[]) {
  const fixture = TestBed.createComponent(SeriesCard);
  fixture.componentRef.setInput('meta', 'Session 3 of 8 · Every Tuesday');
  fixture.componentRef.setInput('heading', 'Couch to 5K Run Club');
  fixture.componentRef.setInput('href', '/events/series/s1');
  fixture.componentRef.setInput('action', 'Join the series');
  fixture.componentRef.setInput('dates', dates);
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

// L2-010 AC5 (ADR 0096): a session's series card.
describe('SeriesCard', () => {
  it('is a region named by its title, with a cancelled date marked and its topic as text', async () => {
    const { root } = await render([
      { id: 'a', when: 'Tue Apr 28', topic: '<b>Hills</b>', cancelled: false },
      { id: 'b', when: 'Tue May 12 · Cancelled', topic: 'No class', cancelled: true },
    ]);
    const section = root.querySelector('section.series-card') as HTMLElement;
    const title = root.querySelector('h2') as HTMLElement;

    expect(section.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toBe('Couch to 5K Run Club');
    expect(Array.from(root.querySelectorAll('li')).map((li) => li.getAttribute('class'))).toEqual([
      'series-card__date',
      'series-card__date series-card__date--cancelled',
    ]);
    expect(root.querySelector('.series-card__topic')?.textContent).toBe('<b>Hills</b>');
    expect(root.querySelector('.series-card__topic b')).toBeNull();
  });

  it('shows no date list when no date follows', async () => {
    const { root } = await render([]);

    expect(root.querySelector('ul')).toBeNull();
  });

  it('hands a plain click on its link to the screen and leaves a modified one to the browser', async () => {
    const { root, emitted } = await render([]);
    const link = root.querySelector('a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/events/series/s1');
    expect(click(link)).toBe(true);
    expect(click(link, { metaKey: true })).toBe(false);
    expect(emitted).toEqual(['/events/series/s1']);
  });
});
