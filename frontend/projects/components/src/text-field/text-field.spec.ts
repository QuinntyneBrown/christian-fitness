import { TestBed } from '@angular/core/testing';
import { SearchField, TextField } from '../public-api';

function renderField(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(TextField);
  fixture.componentRef.setInput('fieldId', 'f-email');
  fixture.componentRef.setInput('label', 'Email');
  fixture.componentRef.setInput('name', 'email');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
  return { fixture, input };
}

describe('TextField', () => {
  it('reports each edit', () => {
    const { fixture, input } = renderField({});
    const edits: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => edits.push(value));

    input.value = 'maya@example.ca';
    input.dispatchEvent(new Event('input'));

    expect(edits).toEqual(['maya@example.ca']);
  });

  it.each([
    ['fine', {}, null, null],
    ['with a hint', { hint: 'We send reminders here' }, null, 'f-email-hint'],
    ['invalid', { error: 'Enter an email like name@example.ca' }, 'true', 'f-email-error'],
  ])('is %s', (_state, inputs, invalid, describedBy) => {
    const { input } = renderField(inputs);

    expect(input.getAttribute('aria-invalid')).toBe(invalid);
    expect(input.getAttribute('aria-describedby')).toBe(describedBy);
  });

  it.each([
    ['read-only', { readonly: true }, 'readOnly'],
    ['disabled', { disabled: true }, 'disabled'],
  ] as const)('can be %s', (_state, inputs, property) => {
    const { input } = renderField(inputs);

    expect(input[property]).toBe(true);
  });
});

describe('SearchField', () => {
  function renderSearch(value: string) {
    const fixture = TestBed.createComponent(SearchField);
    fixture.componentRef.setInput('label', 'Search members');
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    const edits: string[] = [];
    fixture.componentInstance.valueChange.subscribe((edit) => edits.push(edit));
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    return { fixture, input, edits };
  }

  it('is named by its hidden label', () => {
    const { fixture, input } = renderSearch('');
    const label = (fixture.nativeElement as HTMLElement).querySelector('label')!;

    expect(label.contains(input)).toBe(true);
    expect(label.querySelector('.visually-hidden')?.textContent).toBe('Search members');
  });

  it('clears the query on Escape', () => {
    const { input, edits } = renderSearch('grace');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(input.value).toBe('');
    expect(edits).toEqual(['']);
  });

  it('leaves an empty query alone on Escape', () => {
    const { input, edits } = renderSearch('');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(edits).toEqual([]);
  });
});
