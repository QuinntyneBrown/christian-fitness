import { TestBed } from '@angular/core/testing';
import { Select, type SelectOption } from '../public-api';

const categories: readonly SelectOption[] = [
  { value: 'run', label: 'Run' },
  { value: 'workout', label: 'Workout' },
  { value: 'retreat', label: 'Retreat' },
];

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Select);
  fixture.componentRef.setInput('fieldId', 'f-category');
  fixture.componentRef.setInput('label', 'Category');
  fixture.componentRef.setInput('name', 'category');
  fixture.componentRef.setInput('options', categories);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const select = (fixture.nativeElement as HTMLElement).querySelector('select')!;
  return { fixture, select };
}

describe('Select', () => {
  it('shows the chosen option', () => {
    const { select } = render({ value: 'retreat' });

    expect(select.value).toBe('retreat');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Retreat');
  });

  it('reports the option chosen', () => {
    const { fixture, select } = render({ value: 'run' });
    const choices: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => choices.push(value));

    select.value = 'workout';
    select.dispatchEvent(new Event('change'));

    expect(choices).toEqual(['workout']);
  });

  it('starts on its prompt when nothing is chosen', () => {
    const { select } = render({ prompt: 'Choose a category' });

    expect(select.value).toBe('');
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Choose a category');
  });

  it('is invalid with an error, described by it', () => {
    const { select } = render({
      prompt: 'Choose a category',
      error: 'Choose a category so members can filter for it',
    });

    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe('f-category-error');
  });

  it('can be disabled', () => {
    expect(render({ disabled: true }).select.disabled).toBe(true);
  });
});
