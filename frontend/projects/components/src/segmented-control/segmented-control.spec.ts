import { TestBed } from '@angular/core/testing';
import { SegmentedControl, type SegmentedOption } from '../public-api';

const OPTIONS: SegmentedOption[] = [
  { label: 'By date', href: '/events', current: true },
  { label: 'Series (3)', href: '/events?view=series', current: false, icon: 'repeat' },
];

function render(options: SegmentedOption[] = OPTIONS, flush = false) {
  const fixture = TestBed.createComponent(SegmentedControl);
  fixture.componentRef.setInput('label', 'View');
  fixture.componentRef.setInput('options', options);
  fixture.componentRef.setInput('flush', flush);
  fixture.detectChanges();
  const targets: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => targets.push(href));
  return { host: fixture.nativeElement as HTMLElement, targets };
}

describe('SegmentedControl', () => {
  it('is a nav named by its label, with one link a view and the current one marked', () => {
    const { host } = render();

    const nav = host.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('View');
    expect(nav.getAttribute('class')).toBe('segmented');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['By date', '/events'],
      ['Series (3)', '/events?view=series'],
    ]);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual(['page', null]);
    // The repeat icon is decorative.
    expect(links[1]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(links[0]?.querySelector('svg')).toBeNull();
  });

  it('flush drops the top margin with its modifier', () => {
    const { host } = render(OPTIONS, true);

    expect(host.querySelector('nav')?.getAttribute('class')).toBe('segmented segmented--flush');
  });

  it('prevents reload and emits navigate on a plain click', () => {
    const { host, targets } = render();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    host.querySelectorAll('a')[1]!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(targets).toEqual(['/events?view=series']);
  });

  it('leaves a Ctrl-click to the browser without emitting navigate', () => {
    const { host, targets } = render();
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });

    host.querySelectorAll('a')[1]!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(targets).toEqual([]);
  });
});
