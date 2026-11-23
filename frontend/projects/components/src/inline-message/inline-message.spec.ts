import { TestBed } from '@angular/core/testing';
import { InlineMessage } from './inline-message';

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(InlineMessage);
  const all = { heading: 'Messages didn’t load.', text: 'Your events are up to date.', ...inputs };
  for (const [name, value] of Object.entries(all)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const message = fixture.nativeElement.querySelector('.inline-error') as HTMLElement;
  return { fixture, message, retry: message.querySelector('button') as HTMLButtonElement };
}

describe('InlineMessage', () => {
  it('announces a section that failed once, with role alert, and says what still works', async () => {
    const { message } = await render();

    expect(message.getAttribute('role')).toBe('alert');
    expect(message.querySelector('.inline-error__title')?.textContent).toBe(
      'Messages didn’t load.',
    );
    expect(message.textContent).toContain('Your events are up to date.');
  });

  it('emits retry from "Try again"', async () => {
    const { fixture, retry } = await render();
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);

    expect(retry.textContent?.trim()).toBe('Try again');
    retry.click();

    expect(retried).toBe(1);
  });

  it('while the section reloads, reads "Loading…", is busy and cannot be pressed again', async () => {
    const { fixture, retry } = await render({ busy: true });
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => retried++);

    expect(retry.textContent?.trim()).toBe('Loading…');
    expect(retry.getAttribute('aria-busy')).toBe('true');
    retry.click();

    expect(retried).toBe(0);
  });
});
