import { TestBed } from '@angular/core/testing';
import { SaveBar } from './save-bar';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(SaveBar);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  let saves = 0;
  fixture.componentInstance.save.subscribe(() => saves++);
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, saves: () => saves };
}

// L2-064 AC5 to AC7 (save-bar.html): unsaved changes with Save, saving, saved, and a failure as an alert.
describe('SaveBar', () => {
  it('reads the text as text with its action, as a status, and emits save on a press', async () => {
    const { root, saves } = await render({ text: 'Unsaved <b>changes</b>', action: 'Save' });

    const bar = root.querySelector('.save-bar')!;
    expect(bar.getAttribute('role')).toBe('status');
    expect(bar.querySelector('.save-bar__text')?.textContent?.trim()).toBe(
      'Unsaved <b>changes</b>',
    );
    expect(bar.querySelector('b')).toBeNull();
    const button = bar.querySelector<HTMLButtonElement>('button')!;
    expect(button.textContent?.trim()).toBe('Save');
    button.click();
    expect(saves()).toBe(1);
  });

  it('is busy while saving and ignores a press', async () => {
    const { root, saves } = await render({
      text: 'Unsaved changes',
      action: 'Saving…',
      busy: true,
    });

    const button = root.querySelector<HTMLButtonElement>('button')!;
    expect(button.getAttribute('aria-busy')).toBe('true');
    button.click();
    expect(saves()).toBe(0);
  });

  it('has no button once saved and marks the text done; a failure is an alert', async () => {
    const saved = await render({ text: 'Preferences saved', done: true });
    expect(saved.root.querySelector('button')).toBeNull();
    expect(saved.root.querySelector('.save-bar__text--done svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    TestBed.resetTestingModule();

    const failed = await render({ text: 'Couldn’t save.', action: 'Try again', role: 'alert' });
    expect(failed.root.querySelector('.save-bar')?.getAttribute('role')).toBe('alert');
  });
});
