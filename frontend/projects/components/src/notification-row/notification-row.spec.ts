import { TestBed } from '@angular/core/testing';
import { NotificationRow } from './notification-row';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(NotificationRow);
  fixture.componentRef.setInput('href', '/events/1');
  fixture.componentRef.setInput('heading', 'Tomorrow: Easter Sunrise 5K');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  return { el, navigated };
}

// docs/design-system/components/notification-row.html: unread is bold, dotted and named "Unread";
// text is rendered as text; a plain click emits navigate.
describe('NotificationRow', () => {
  it('a read row has no unread mark', async () => {
    const { el } = await render({ text: 'Sat, Apr 18', time: 'Apr 17' });

    expect(el.querySelector('.note')?.classList.contains('note--unread')).toBe(false);
    expect(el.querySelector('[role="img"]')).toBeNull();
    expect(el.querySelector('.note__time')?.textContent).toBe('Apr 17');
  });

  it('an unread row is marked and named Unread', async () => {
    const { el } = await render({ unread: true });

    expect(el.querySelector('.note')?.classList.contains('note--unread')).toBe(true);
    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Unread');
  });

  it('renders markup in a title as text', async () => {
    const { el } = await render({ heading: '<b>Bold</b>' });

    expect(el.querySelector('.note__title')?.textContent).toBe('<b>Bold</b>');
    expect(el.querySelector('b')).toBeNull();
  });

  it('emits navigate on a plain click', async () => {
    const { el, navigated } = await render({});

    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    el.querySelector('a')?.dispatchEvent(click);

    expect(navigated).toEqual(['/events/1']);
    expect(click.defaultPrevented).toBe(true);
  });
});
