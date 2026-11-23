import { TestBed } from '@angular/core/testing';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

const TRAIL: readonly BreadcrumbItem[] = [
  { label: 'Admin', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Danielle Okafor', href: '/services/danielle-okafor' },
];

async function render(items: readonly BreadcrumbItem[], collapsible = false) {
  const fixture = TestBed.createComponent(Breadcrumb);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('collapsible', collapsible);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  return { el, navigated };
}

describe('Breadcrumb', () => {
  it('is a navigation named "Breadcrumb" around an ordered list, the last link current', async () => {
    const { el } = await render(TRAIL);

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Breadcrumb');
    const links = [...el.querySelectorAll('ol > li > a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('aria-current')])).toEqual([
      ['Admin', null],
      ['Services', null],
      ['Danielle Okafor', 'page'],
    ]);
  });

  // The collapsed trail links to the parent, its arrow hidden (breadcrumb.html, "Labelling").
  it.each<[boolean, readonly BreadcrumbItem[], [string, string] | null]>([
    [false, TRAIL, null],
    [true, TRAIL, ['Services', '/services']],
    [true, TRAIL.slice(1, 2), null],
  ])('collapsible %s with %j offers the parent link %j', async (collapsible, items, parent) => {
    const { el } = await render(items, collapsible);

    const up = el.querySelector('.breadcrumb__item--parent-only a');
    expect(up ? [up.textContent, up.getAttribute('href')] : null).toEqual(parent);
    if (up) {
      expect(up.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(up.getAttribute('aria-current')).toBeNull();
    }
  });

  it('hands a plain click to the app with the href, and leaves a modified click to the browser', async () => {
    const { el, navigated } = await render(TRAIL);
    const services = el.querySelectorAll('ol a')[1];

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    services.dispatchEvent(plain);
    const newTab = new MouseEvent('click', { bubbles: true, cancelable: true, altKey: true });
    services.dispatchEvent(newTab);

    expect(navigated).toEqual(['/services']);
    expect(plain.defaultPrevented).toBe(true);
    expect(newTab.defaultPrevented).toBe(false);
  });

  it('renders labels as text, never as markup', async () => {
    const { el } = await render([{ label: '<b>Run</b>', href: '/events/run' }]);

    expect(el.querySelector('a b')).toBeNull();
    expect(el.querySelector('a')?.textContent).toBe('<b>Run</b>');
  });
});
