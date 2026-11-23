import { TestBed } from '@angular/core/testing';
import type { AdminNavItem } from './admin-nav';
import { SidebarNavigation } from './sidebar-navigation';

const ITEMS: readonly AdminNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/' },
  { key: 'events', label: 'Events', href: '/events', count: 0, countLabel: '0 drafts' },
  {
    key: 'services',
    label: 'Services',
    href: '/services',
    count: 3,
    countLabel: '3 applications waiting',
  },
  {
    key: 'members',
    label: 'Members',
    href: '/members',
    count: 1,
    countLabel: '1 report to review',
  },
];

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(SidebarNavigation);
  fixture.componentRef.setInput('items', ITEMS);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  let signOuts = 0;
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  fixture.componentInstance.signOut.subscribe(() => signOuts++);
  return { fixture, el, navigated, signOuts: () => signOuts };
}

function link(el: HTMLElement, label: string): HTMLAnchorElement {
  const found = [...el.querySelectorAll<HTMLAnchorElement>('nav a')].find((a) =>
    a.textContent?.includes(label),
  );
  if (!found) throw new Error(`No link ${label}`);
  return found;
}

describe('SidebarNavigation', () => {
  it('is a navigation landmark named "Admin" of real links, the current one marked', async () => {
    const { el } = await render({ current: 'services' });

    const nav = el.querySelector('aside nav');
    expect(nav?.getAttribute('aria-label')).toBe('Admin');
    expect([...el.querySelectorAll('nav a')].map((a) => a.getAttribute('href'))).toEqual([
      '/',
      '/events',
      '/services',
      '/members',
    ]);
    expect(
      [...el.querySelectorAll('[aria-current="page"]')].map((a) => a.textContent?.trim()),
    ).toEqual([expect.stringContaining('Services')]);
  });

  it('marks no link current outside the areas', async () => {
    const { el } = await render({ current: null });

    expect(el.querySelectorAll('[aria-current]').length).toBe(0);
  });

  // Counts show work waiting, each read in full; a zero count is noise (sidebar-navigation.html,
  // "Do and don't").
  it.each<[string, string | null, string | null]>([
    ['Dashboard', null, null],
    ['Events', null, null],
    ['Services', '3', '3 applications waiting'],
    ['Members', '1', '1 report to review'],
  ])('the %s link shows count %s, read as %s', async (label, text, name) => {
    const { el } = await render();

    const count = link(el, label).querySelector('.admin-nav__count');
    expect(count?.textContent?.trim() ?? null).toBe(text);
    expect(count?.getAttribute('aria-label') ?? null).toBe(name);
  });

  it('hands a plain click to the app with the href, and leaves a modified click to the browser', async () => {
    const { el, navigated } = await render();
    const events = link(el, 'Events');

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    events.dispatchEvent(plain);
    const newTab = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    events.dispatchEvent(newTab);
    const middle = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 });
    events.dispatchEvent(middle);

    expect(navigated).toEqual(['/events']);
    expect(plain.defaultPrevented).toBe(true);
    expect(newTab.defaultPrevented).toBe(false);
    expect(middle.defaultPrevented).toBe(false);
  });

  it('shows the staff member and reports Sign out, a named 44 px icon button', async () => {
    const { el, signOuts } = await render({
      userName: 'Rachel Adeyemi',
      userRole: 'Community lead',
      userInitials: 'RA',
    });

    expect(el.querySelector('.admin__user-name')?.textContent).toBe('Rachel Adeyemi');
    expect(el.querySelector('.admin__user-role')?.textContent).toBe('Community lead');
    const signOut = el.querySelector<HTMLButtonElement>('button[aria-label="Sign out"]');
    signOut?.click();
    expect(signOuts()).toBe(1);
    expect(signOut?.getAttribute('aria-busy')).toBeNull();
  });

  it('while signing out, Sign out is disabled and busy', async () => {
    const { el, signOuts } = await render({ signingOut: true });

    const signOut = el.querySelector<HTMLButtonElement>('button[aria-label="Sign out"]');
    expect(signOut?.disabled).toBe(true);
    expect(signOut?.getAttribute('aria-busy')).toBe('true');
    signOut?.click();
    expect(signOuts()).toBe(0);
  });

  it('renders names as text, never as markup', async () => {
    const { el } = await render({ userName: '<img src=x onerror="alert(1)">' });

    expect(el.querySelector('.admin__user-name img')).toBeNull();
    expect(el.querySelector('.admin__user-name')?.textContent).toBe(
      '<img src=x onerror="alert(1)">',
    );
  });

  it('names the brand in words, its seal hidden from assistive technology', async () => {
    const { el } = await render();

    const seal = el.querySelector('.admin__brand svg');
    expect(seal?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.admin__brand-name')?.textContent).toBe('Christian Fitness');
  });
});
