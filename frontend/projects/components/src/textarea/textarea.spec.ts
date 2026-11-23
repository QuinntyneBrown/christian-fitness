import { TestBed } from '@angular/core/testing';
import { Textarea } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Textarea);
  fixture.componentRef.setInput('fieldId', 'f-bio');
  fixture.componentRef.setInput('label', 'About');
  fixture.componentRef.setInput('name', 'bio');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const textarea = element.querySelector('textarea')!;
  const type = (text: string) => {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  return { fixture, element, textarea, type };
}

describe('Textarea', () => {
  afterEach(() => vi.useRealTimers());

  it('reports each edit', () => {
    const { fixture, type } = render({});
    const edits: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => edits.push(value));

    type('Runner, early riser.');

    expect(edits).toEqual(['Runner, early riser.']);
  });

  it('starts at the rows it is given, 4 by default', () => {
    expect(render({}).textarea.getAttribute('rows')).toBe('4');
    expect(render({ rows: 3 }).textarea.getAttribute('rows')).toBe('3');
  });

  it('counts the characters left in its hint as people type', () => {
    const { element, textarea, type } = render({ hint: 'A sentence or two.', maxLength: 20 });

    type('Runner');

    expect(element.querySelector('.field__hint')?.textContent?.trim()).toBe(
      'A sentence or two. 14 characters left.',
    );
    expect(textarea.getAttribute('aria-describedby')).toBe('f-bio-hint');
    expect(textarea.hasAttribute('maxlength')).toBe(false);
  });

  it('turns the counter into an error past the limit, without truncating', () => {
    const { element, textarea, type } = render({ maxLength: 5 });

    type('Runner');

    expect(element.querySelector('.field__error')?.textContent?.trim()).toBe('1 character over');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.value).toBe('Runner');
  });

  it('announces the count politely only after typing pauses', () => {
    vi.useFakeTimers();
    const { fixture, element, type } = render({ maxLength: 10 });
    const live = element.querySelector('[aria-live="polite"]')!;

    type('Run');
    vi.advanceTimersByTime(999);
    fixture.detectChanges();
    expect(live.textContent?.trim()).toBe('');

    type('Runner');
    vi.advanceTimersByTime(999);
    fixture.detectChanges();
    expect(live.textContent?.trim()).toBe('');

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(live.textContent?.trim()).toBe('4 characters left.');
  });

  it('stops its pending announcement when destroyed', () => {
    vi.useFakeTimers();
    const { fixture, type } = render({ maxLength: 10 });
    type('Run');

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
