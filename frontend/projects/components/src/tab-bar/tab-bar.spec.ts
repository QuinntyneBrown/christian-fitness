import { TestBed } from '@angular/core/testing';
import type { MemberDestination } from '../top-bar/member-destination';
import { TabBar } from './tab-bar';

const DESTINATIONS: readonly MemberDestination[] = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'directory', label: 'Directory', href: '/directory' },
  { key: 'services', label: 'Services', href: '/services' },
  { key: 'messages', label: 'Messages', href: '/messages' },
  { key: 'profile', label: 'Profile', href: '/profile' },
];

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(TabBar);
  fixture.componentRef.setInput('destinations', DESTINATIONS);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  return { el, navigated };
}

/** The words a screen reader reads for a link: its text, without what is hidden from it. */
function nameOf(link: Element): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if ((node as Element).getAttribute?.('aria-hidden') === 'true') return '';
    return [...node.childNodes].map(walk).join('');
  };
  return walk(link).replace(/\s+/g, ' ').trim();
}

describe('TabBar', () => {
  it('is a navigation named "Primary, mobile" of six links, each named by its label', async () => {
    const { el } = await render();

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary, mobile');
    const links = [...el.querySelectorAll('nav a')];
    expect(links.map(nameOf)).toEqual([
      'Home',
      'Events',
      'Directory',
      'Services',
      'Messages',
      'Profile',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/home',
      '/events',
      '/directory',
      '/services',
      '/messages',
      '/profile',
    ]);
    expect(
      [...el.querySelectorAll('nav svg')].every((svg) => svg.getAttribute('aria-hidden')),
    ).toBe(true);
  });

  // Current is aria-current="page" on one item (tab-bar.html, "States").
  it.each<[string | null, string[]]>([
    ['home', ['Home']],
    ['events', ['Events']],
    ['directory', ['Directory']],
    ['profile', ['Profile']],
    [null, []],
  ])('with %s current, %j is marked', async (current, marked) => {
    const { el } = await render({ current });

    expect([...el.querySelectorAll('[aria-current="page"]')].map(nameOf)).toEqual(marked);
  });

  // The dot is never the only signal: hidden words go with it (tab-bar.html, "Labelling").
  it.each<[number, string, boolean]>([
    [0, 'Messages', false],
    [4, 'Messages, 4 unread', true],
  ])('with %i unread, Messages reads "%s" (dot %s)', async (unread, name, dot) => {
    const { el } = await render({ unread });

    const messages = el.querySelector('nav a[href="/messages"]')!;
    expect(nameOf(messages)).toBe(name);
    const shownDot = messages.querySelector('.tab-bar__dot');
    expect(shownDot !== null).toBe(dot);
    if (shownDot) expect(shownDot.getAttribute('aria-hidden')).toBe('true');
  });

  it('hands a plain click to the app with the href, and leaves a modified click to the browser', async () => {
    const { el, navigated } = await render();
    const events = [...el.querySelectorAll('nav a')][1];

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    events.dispatchEvent(plain);
    const newWindow = new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true });
    events.dispatchEvent(newWindow);

    expect(navigated).toEqual(['/events']);
    expect(plain.defaultPrevented).toBe(true);
    expect(newWindow.defaultPrevented).toBe(false);
  });

  it('with no destinations there is no bar', async () => {
    const { el } = await render({ destinations: [] });

    expect(el.querySelector('nav')).toBeNull();
  });
});
