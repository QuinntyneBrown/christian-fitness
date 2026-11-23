import { TestBed } from '@angular/core/testing';
import { FormField, fieldDescribedBy } from '../public-api';

describe('fieldDescribedBy', () => {
  it.each([
    ['nothing', undefined, undefined, null],
    ['a hint', 'At least 8 characters', undefined, 'f-pw-hint'],
    ['an error', undefined, 'Enter a password', 'f-pw-error'],
    ['an error in place of the hint', 'At least 8 characters', 'Enter a password', 'f-pw-error'],
    ['an empty error as no error', 'At least 8 characters', '', 'f-pw-hint'],
  ])('describes the control by %s', (_case, hint, error, expected) => {
    expect(fieldDescribedBy('f-pw', hint, error)).toBe(expected);
  });
});

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(FormField);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('FormField', () => {
  it('ties its label to the control by id', () => {
    const element = render({ fieldId: 'f-email', label: 'Email' });

    expect(element.querySelector('label')?.getAttribute('for')).toBe('f-email');
  });

  it('says a field is optional in its label', () => {
    const element = render({ fieldId: 'f-church', label: 'Home church', optional: true });

    expect(element.querySelector('label')?.textContent?.trim()).toBe('Home church (optional)');
  });

  it('shows the error, rendered as text, in place of the hint', () => {
    const element = render({
      fieldId: 'f-name',
      label: 'Name',
      hint: 'As people know you',
      error: '<b>Enter your name</b>',
    });

    expect(element.querySelector('.field__error')?.textContent?.trim()).toBe(
      '<b>Enter your name</b>',
    );
    expect(element.querySelector('.field__error')?.id).toBe('f-name-error');
    expect(element.querySelector('.field__hint')).toBeNull();
  });

  it('names a group with a legend and describes it by its error', () => {
    const element = render({
      fieldId: 'f-where',
      label: 'Where would you like to meet?',
      group: true,
      error: "Choose where you'd like to meet",
    });

    const fieldset = element.querySelector('fieldset')!;
    expect(fieldset.querySelector('legend')?.textContent?.trim()).toBe(
      'Where would you like to meet?',
    );
    expect(fieldset.getAttribute('aria-describedby')).toBe('f-where-error');
    expect(element.querySelector('label')).toBeNull();
  });
});
