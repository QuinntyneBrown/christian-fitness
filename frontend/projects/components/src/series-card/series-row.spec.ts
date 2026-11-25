import { TestBed } from '@angular/core/testing';
import { SeriesRow } from '../public-api';

function render(joined: boolean) {
  const fixture = TestBed.createComponent(SeriesRow);
  const set = (name: string, value: unknown) => fixture.componentRef.setInput(name, value);
  set('href', '/events/series/s1');
  set('imageSrc', '/images/events/run.jpg');
  set('meta', 'Every Tuesday · 6:30 PM');
  set('heading', '<b>Couch to 5K</b>');
  set('sub', 'Lakeshore Runners Fellowship · Etobicoke · Apr 7 – May 26');
  set('bars', ['done', 'next', 'upcoming', 'cancelled']);
  set('done', '1 of 3 sessions done');
  set('joined', joined);
  set('price', '$64 for all 3');
  set('next', 'Next Apr 21');
  fixture.detectChanges();
  const targets: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => targets.push(href));
  return { host: fixture.nativeElement as HTMLElement, targets };
}

describe('SeriesRow', () => {
  it('is one link with the title as text, the meter and its hidden words', () => {
    const { host } = render(false);

    const link = host.querySelector('a.series-row')!;
    expect(link.getAttribute('href')).toBe('/events/series/s1');
    expect(link.querySelector('h2')?.textContent).toBe('<b>Couch to 5K</b>');
    expect(link.querySelector('b')).toBeNull();
    expect(
      [...link.querySelectorAll('.session-meter__bar')].map((b) => b.getAttribute('class')),
    ).toEqual([
      'session-meter__bar session-meter__bar--done',
      'session-meter__bar session-meter__bar--next',
      'session-meter__bar',
      'session-meter__bar session-meter__bar--cancelled',
    ]);
    expect(link.querySelector('.session-meter')?.getAttribute('aria-hidden')).toBe('true');
    expect(link.querySelector('.visually-hidden')?.textContent).toBe('1 of 3 sessions done');
    expect(link.querySelector('.series-row__price')?.textContent).toBe('$64 for all 3');
  });

  it('reads Joined in place of the price when joined', () => {
    const { host } = render(true);

    expect(host.querySelector('.tag.tag--sm')?.textContent).toBe('Joined');
    expect(host.querySelector('.series-row__price')).toBeNull();
  });

  it('prevents reload and emits navigate on a plain click, and leaves a Ctrl-click alone', () => {
    const { host, targets } = render(false);
    const link = host.querySelector('a')!;
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

    link.dispatchEvent(plain);
    link.dispatchEvent(ctrl);

    expect(plain.defaultPrevented).toBe(true);
    expect(ctrl.defaultPrevented).toBe(false);
    expect(targets).toEqual(['/events/series/s1']);
  });
});
