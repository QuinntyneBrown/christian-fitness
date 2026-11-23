import { TestBed } from '@angular/core/testing';
import { Tabs, type TabItem } from './tabs';

const tabs: readonly TabItem[] = [
  { label: 'All', href: '/admin/events', count: 5 },
  { label: 'Published', href: '/admin/events?status=published', count: 4 },
  { label: 'Draft', href: '/admin/events?status=draft', count: 0 },
];

async function render(current: string) {
  const fixture = TestBed.createComponent(Tabs);
  fixture.componentRef.setInput('label', 'Filter events');
  fixture.componentRef.setInput('tabs', tabs);
  fixture.componentRef.setInput('current', current);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('.tabs__tab'));
  const followed: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => followed.push(href));
  return { el, links, followed };
}

describe('Tabs', () => {
  it('is a labelled navigation of links whose names include their counts, zero too', async () => {
    const { el, links } = await render('/admin/events');

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Filter events');
    expect(links.map((link) => link.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'All 5',
      'Published 4',
      'Draft 0',
    ]);
  });

  // The current filter is aria-current="page", one row per tab.
  it.each<[string, (string | null)[]]>([
    ['/admin/events', ['page', null, null]],
    ['/admin/events?status=published', [null, 'page', null]],
    ['/admin/events?status=draft', [null, null, 'page']],
  ])('on %s, marks the current tab', async (current, expected) => {
    const { links } = await render(current);

    expect(links.map((link) => link.getAttribute('aria-current'))).toEqual(expected);
  });

  it('hands a plain click to the screen and leaves a modified click to the browser', async () => {
    const { links, followed } = await render('/admin/events');

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    links[1].dispatchEvent(plain);
    const newTab = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    links[2].dispatchEvent(newTab);

    expect(followed).toEqual(['/admin/events?status=published']);
    expect(plain.defaultPrevented).toBe(true);
    expect(newTab.defaultPrevented).toBe(false);
  });
});
