import { TestBed } from '@angular/core/testing';
import { FileField } from '../public-api';

function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(FileField);
  fixture.componentRef.setInput('fieldId', 'f-image');
  fixture.componentRef.setInput('label', 'Image');
  fixture.componentRef.setInput('name', 'image');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    element,
    input: element.querySelector<HTMLInputElement>('input[type=file]')!,
    name: () => element.querySelector('.file-field__name')!,
    buttons: () => [...element.querySelectorAll('button')],
  };
}

describe('FileField', () => {
  it('says no file is chosen, with only the choose button, and marks the field optional', () => {
    const { element, name, buttons } = render({ optional: true });

    expect(name().textContent).toBe('No image chosen');
    expect(name().classList).toContain('file-field__name--empty');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['Choose image']);
    expect(element.querySelector('.field__optional')?.textContent).toBe('(optional)');
  });

  it('shows the chosen name with Remove, named after what it removes', () => {
    const { name, buttons } = render({ fileName: 'park.jpg' });

    expect(name().textContent).toBe('park.jpg');
    expect(buttons().map((b) => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Choose image',
      'Remove image',
    ]);
  });

  it('gives the button the field id and what describes it: the hint, then the error instead', () => {
    const hinted = render({ hint: 'JPEG, PNG or WebP, up to 5 MB' });
    const button = hinted.buttons()[0];
    expect(button.id).toBe('f-image');
    expect(button.getAttribute('aria-describedby')).toBe('f-image-hint');

    const refused = render({ hint: 'a hint', error: 'Use a JPEG' });
    expect(refused.buttons()[0].getAttribute('aria-describedby')).toBe('f-image-error');
    expect(refused.element.querySelector('.field__error')?.textContent).toBe('Use a JPEG');
    expect(refused.element.querySelector('.field__hint')).toBeNull();
  });

  it('opens the picker from the choose button and offers the accepted types', () => {
    const { input, buttons } = render({ accept: 'image/png' });
    const clicked = vi.spyOn(input, 'click');

    buttons()[0].click();

    expect(clicked).toHaveBeenCalledOnce();
    expect(input.getAttribute('accept')).toBe('image/png');
  });

  it('hands over the picked file and clears the input so the same file can be chosen again', () => {
    const { fixture, input } = render();
    const chosen: File[] = [];
    fixture.componentInstance.fileChosen.subscribe((file) => chosen.push(file));
    const file = new File(['x'], 'park.png', { type: 'image/png' });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;

    input.dispatchEvent(new Event('change'));

    expect(chosen).toEqual([file]);
    expect(input.value).toBe('');
  });

  it('says Remove was chosen, and does nothing while disabled', () => {
    const { fixture, buttons } = render({ fileName: 'park.jpg' });
    let removed = 0;
    fixture.componentInstance.removed.subscribe(() => removed++);

    buttons()[1].click();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    buttons()[1].click();

    expect(removed).toBe(1);
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });
});
