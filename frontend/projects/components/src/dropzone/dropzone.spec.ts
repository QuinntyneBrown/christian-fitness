import { TestBed } from '@angular/core/testing';
import { Dropzone } from '../public-api';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Dropzone);
  fixture.componentRef.setInput('title', 'Add a lead image');
  fixture.componentRef.setInput('hint', '16:9, at least 1600 px wide');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const chosen: File[] = [];
  fixture.componentInstance.fileChosen.subscribe((file) => chosen.push(file));
  const button = element.querySelector<HTMLButtonElement>('.dropzone')!;
  return {
    fixture,
    button,
    chosen,
    drag: (type: string, files: File[] = []) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { files } });
      button.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    },
  };
}

// docs/design-system/components/dropzone.html: dropping is an extra for pointer users; a file
// dragged over it marks it, and while busy or disabled a drop is ignored.
describe('Dropzone', () => {
  it('is named by its title and described by its hint', () => {
    const { button } = render();
    const name = document.getElementById(button.getAttribute('aria-labelledby')!);
    const hint = document.getElementById(button.getAttribute('aria-describedby')!);

    expect([name?.textContent, hint?.textContent]).toEqual([
      'Add a lead image',
      '16:9, at least 1600 px wide',
    ]);
  });

  it('marks a file dragged over it and hands over a file dropped on it', () => {
    const { button, chosen, drag } = render();
    const file = new File([], 'lead.jpg');

    expect(drag('dragover').defaultPrevented).toBe(true);
    expect(button.getAttribute('data-state')).toBe('dragover');
    drag('drop', [file]);

    expect([button.getAttribute('data-state'), chosen]).toEqual([null, [file]]);
  });

  it.each([{ busy: true }, { disabled: true }])('ignores a drop while %j', (inputs) => {
    const { chosen, drag } = render(inputs);

    expect(drag('dragover').defaultPrevented).toBe(false);
    drag('drop', [new File([], 'lead.jpg')]);

    expect(chosen).toEqual([]);
  });

  it('shows Uploading… while busy, announced as busy', () => {
    const { button } = render({ busy: true });

    expect([button.textContent?.trim(), button.getAttribute('aria-busy')]).toEqual([
      'Uploading…',
      'true',
    ]);
  });
});
