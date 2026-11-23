import { TestBed } from '@angular/core/testing';
import { ToastRegion, type ToastData } from './toast-region';

const registered: ToastData = {
  id: 'a',
  tone: 'success',
  heading: 'You’re registered',
  text: 'We’ve added you to the Saturday Park Bootcamp group chat.',
  actionLabel: 'Open chat',
  actionHref: '/messages',
};
const failed: ToastData = {
  id: 'b',
  tone: 'danger',
  heading: 'We couldn’t register you',
  actionLabel: 'Try again',
};

async function render(toasts: readonly ToastData[], admin = false) {
  const fixture = TestBed.createComponent(ToastRegion);
  fixture.componentRef.setInput('toasts', toasts);
  fixture.componentRef.setInput('admin', admin);
  await fixture.whenStable();
  const region = fixture.nativeElement.querySelector('.toast-region') as HTMLElement;
  return { fixture, region };
}

describe('ToastRegion', () => {
  it('is present and labelled even with no toast, so the first one is announced', async () => {
    const { region } = await render([]);

    expect(region.tagName).toBe('SECTION');
    expect(region.getAttribute('aria-label')).toBe('Notifications');
    expect(region.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
  });

  // One row per tone (toast.html, "States"): only a failure is announced at once.
  it.each<[ToastData['tone'], string]>([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['danger', 'alert'],
  ])('a %s toast is announced through role %s', async (tone, role) => {
    const { region } = await render([{ id: 'x', tone, heading: 'Draft saved' }]);

    const toast = region.querySelector('.toast') as HTMLElement;
    expect(toast.closest(`[role="${role}"]`)).not.toBeNull();
  });

  it('emits dismissed with the toast’s id from a button named "Dismiss"', async () => {
    const { fixture, region } = await render([registered]);
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    const close = region.querySelector('.toast__close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Dismiss');
    close.click();

    expect(dismissed).toEqual(['a']);
  });

  it('dismisses the toast holding focus when Escape is pressed', async () => {
    const { fixture, region } = await render([registered, failed]);
    const dismissed: string[] = [];
    fixture.componentInstance.dismissed.subscribe((id) => dismissed.push(id));

    const close = region.querySelector('.toast--danger .toast__close') as HTMLButtonElement;
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(dismissed).toEqual(['b']);
  });

  it('offers an action as a link with an address, and as a button that emits the id otherwise', async () => {
    const { fixture, region } = await render([registered, failed]);
    const acted: string[] = [];
    fixture.componentInstance.action.subscribe((id) => acted.push(id));

    expect(region.querySelector('a.toast__action')?.getAttribute('href')).toBe('/messages');
    (region.querySelector('button.toast__action') as HTMLButtonElement).click();

    expect(acted).toEqual(['b']);
  });

  it('asks for its timers to pause while the pointer is over it or focus is inside it', async () => {
    const { fixture, region } = await render([registered]);
    const paused: boolean[] = [];
    fixture.componentInstance.paused.subscribe((value) => paused.push(value));

    region.dispatchEvent(new Event('pointerenter'));
    region.dispatchEvent(new Event('pointerleave'));
    region.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    region.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(paused).toEqual([true, false, true, false]);
  });

  it('keeps its timers paused while focus moves from one toast to another', async () => {
    const { fixture, region } = await render([registered, failed]);
    const paused: boolean[] = [];
    fixture.componentInstance.paused.subscribe((value) => paused.push(value));
    const [first, second] = Array.from(region.querySelectorAll('button')) as HTMLButtonElement[];

    region.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    first.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: second }));

    expect(paused).toEqual([true]);
  });

  it('stays paused while focus is inside after the pointer leaves, and the other way round', async () => {
    const { fixture, region } = await render([registered]);
    const paused: boolean[] = [];
    fixture.componentInstance.paused.subscribe((value) => paused.push(value));

    region.dispatchEvent(new Event('pointerenter'));
    region.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    region.dispatchEvent(new Event('pointerleave'));
    expect(paused).toEqual([true]);
    region.dispatchEvent(new Event('pointerenter'));
    region.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(paused).toEqual([true]);
    region.dispatchEvent(new Event('pointerleave'));
    expect(paused).toEqual([true, false]);
  });

  it('renders words as text', async () => {
    const { region } = await render([
      { id: 'x', tone: 'info', heading: '<b>x</b>', text: '<i>y</i>' },
    ]);

    expect(region.querySelector('.toast__title')?.textContent).toBe('<b>x</b>');
    expect(region.querySelector('.toast__text')?.textContent).toBe('<i>y</i>');
    expect(region.querySelector('b, i')).toBeNull();
  });
});
