import { TestBed } from '@angular/core/testing';
import type { MemberDestination } from './member-destination';
import { TopBar } from './top-bar';

const DESTINATIONS: readonly MemberDestination[] = [
  { key: 'home', label: 'Home', href: '/home' },
  { key: 'events', label: 'Events', href: '/events' },
  { key: 'services', label: 'Services', href: '/services' },
  { key: 'messages', label: 'Messages', href: '/messages' },
  { key: 'profile', label: 'Profile', href: '/profile' },
];

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(TopBar);
  fixture.componentRef.setInput('homeHref', '/home');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  let signOuts = 0;
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  fixture.componentInstance.signOut.subscribe(() => signOuts++);
  return { el, navigated, signOuts: () => signOuts };
}

function linkNamed(el: HTMLElement, text: string): HTMLAnchorElement {
  const found = [...el.querySelectorAll<HTMLAnchorElement>('nav a')].find((a) =>
    a.textContent?.includes(text),
  );
  if (!found) throw new Error(`No link ${text}`);
  return found;
}

function plainClick(target: Element): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  target.dispatchEvent(event);
  return event;
}

describe('TopBar, app header', () => {
  it('is a banner with a "Primary" navigation of four links; Profile is the profile button', async () => {
    const { el } = await render({ destinations: DESTINATIONS, profileHref: '/profile' });

    expect(el.querySelector('header nav')?.getAttribute('aria-label')).toBe('Primary');
    expect([...el.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      'Home',
      'Events',
      'Services',
      'Messages',
    ]);
    expect(el.querySelector('a[aria-label="Your profile"]')?.getAttribute('href')).toBe('/profile');
  });

  // Current is aria-current="page" on exactly one place (top-bar.html, "States").
  it.each<[string, string | null, string | null]>([
    ['home', 'Home', null],
    ['messages', 'Messages', null],
    ['profile', null, 'page'],
  ])(
    'with %s current, the current link is %s and the profile button %s',
    async (current, link, profile) => {
      const { el } = await render({
        destinations: DESTINATIONS,
        current,
        profileHref: '/profile',
      });

      const marked = [...el.querySelectorAll('nav [aria-current="page"]')];
      expect(marked.map((a) => a.textContent?.trim())).toEqual(link ? [link] : []);
      expect(el.querySelector('a[aria-label="Your profile"]')?.getAttribute('aria-current')).toBe(
        profile,
      );
    },
  );

  it('with no destinations there is no navigation landmark', async () => {
    const { el } = await render({ profileHref: '/profile' });

    expect(el.querySelector('nav')).toBeNull();
    expect(el.querySelector('a[aria-label="Your profile"]')).not.toBeNull();
  });

  // Unread is a count read with its noun, never colour alone (L2-008 AC3).
  it.each<[number, string | null, string | null]>([
    [0, null, null],
    [4, '4', '4 unread'],
    [140, '99+', '140 unread'],
  ])('with %i unread, Messages shows %s read as %s', async (unread, text, name) => {
    const { el } = await render({ destinations: DESTINATIONS, unread });

    const badge = linkNamed(el, 'Messages').querySelector('.count-badge');
    expect(badge?.textContent?.trim() ?? null).toBe(text);
    expect(badge?.getAttribute('aria-label') ?? null).toBe(name);
    expect(linkNamed(el, 'Events').querySelector('.count-badge')).toBeNull();
  });

  it('hands a plain click on a link or the profile button to the app, and leaves others to the browser', async () => {
    const { el, navigated } = await render({
      destinations: DESTINATIONS,
      profileHref: '/profile',
    });

    const events = plainClick(linkNamed(el, 'Events'));
    const profile = plainClick(el.querySelector('a[aria-label="Your profile"]') as Element);
    const newTab = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    linkNamed(el, 'Services').dispatchEvent(newTab);

    expect(navigated).toEqual(['/events', '/profile']);
    expect(events.defaultPrevented).toBe(true);
    expect(profile.defaultPrevented).toBe(true);
    expect(newTab.defaultPrevented).toBe(false);
  });

  it('shows the member initials and names the profile button in words', async () => {
    const { el } = await render({ profileHref: '/profile', profileInitials: 'GT' });

    const button = el.querySelector('a[aria-label="Your profile"]');
    expect(button?.textContent?.trim()).toBe('GT');
  });

  it('reports Sign out, and while signing out it is disabled and busy', async () => {
    const idle = await render();
    idle.el.querySelector<HTMLButtonElement>('header button')?.click();
    expect(idle.signOuts()).toBe(1);

    const busy = await render({ signingOut: true });
    const button = busy.el.querySelector<HTMLButtonElement>('header button');
    expect(button?.textContent?.trim()).toBe('Sign out');
    expect(button?.disabled).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    button?.click();
    expect(busy.signOuts()).toBe(0);
  });

  it('links the lockup home, named by its words', async () => {
    const { el } = await render();

    const lockup = el.querySelector('header a') as HTMLAnchorElement;
    expect(lockup.getAttribute('href')).toBe('/home');
    expect(lockup.textContent?.trim()).toBe('Christian Fitness');
  });
});

describe('TopBar, site header', () => {
  it('offers "Sign in" and "Join free" as links, and no member navigation', async () => {
    const { el } = await render({ variant: 'site', homeHref: '/' });

    const links = [...el.querySelectorAll<HTMLAnchorElement>('header a')].map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);
    expect(links).toEqual([
      ['Christian Fitness', '/'],
      ['Sign in', '/sign-in'],
      ['Join free', '/join'],
    ]);
    expect(el.querySelector('nav')).toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });
});
