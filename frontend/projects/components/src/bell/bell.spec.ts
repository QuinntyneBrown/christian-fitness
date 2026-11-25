import { TestBed } from '@angular/core/testing';
import { Bell, bellBadge, bellLabel } from './bell';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Bell);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  return { link: el.querySelector('a.bell') as HTMLAnchorElement, navigated };
}

// ADR 0068 (docs/design-system/components/bell.html): no pill at zero, the count to nine, then 9+;
// the name says the exact number and the pill is hidden from assistive technology.
describe('bellBadge and bellLabel', () => {
  it.each([
    [0, '', 'Notifications'],
    [-1, '', 'Notifications'],
    [1, '1', 'Notifications, 1 unread'],
    [9, '9', 'Notifications, 9 unread'],
    [10, '9+', 'Notifications, 10 unread'],
    [120, '9+', 'Notifications, 120 unread'],
  ])('%i unread shows "%s" and is named "%s"', (unread, badge, label) => {
    expect(bellBadge(unread)).toBe(badge);
    expect(bellLabel(unread)).toBe(label);
  });
});

describe('Bell', () => {
  it('with nothing unread is the icon alone, named Notifications', async () => {
    const { link } = await render({ href: '/notifications' });

    expect(link.getAttribute('href')).toBe('/notifications');
    expect(link.getAttribute('aria-label')).toBe('Notifications');
    expect(link.querySelector('.bell__count')).toBeNull();
    expect(link.getAttribute('aria-current')).toBeNull();
  });

  it('with twelve unread shows 9+ hidden from assistive technology and names 12', async () => {
    const { link } = await render({ href: '/notifications', count: 12, current: true });

    const pill = link.querySelector('.bell__count');
    expect(pill?.textContent?.trim()).toBe('9+');
    expect(pill?.getAttribute('aria-hidden')).toBe('true');
    expect(link.getAttribute('aria-label')).toBe('Notifications, 12 unread');
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('emits navigate on a plain click and leaves a modified click to the browser', async () => {
    const { link, navigated } = await render({ href: '/notifications' });

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    const modified = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      ctrlKey: true,
    });
    link.dispatchEvent(modified);

    expect(navigated).toEqual(['/notifications']);
    expect(plain.defaultPrevented).toBe(true);
    expect(modified.defaultPrevented).toBe(false);
  });
});
