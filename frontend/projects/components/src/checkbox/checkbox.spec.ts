import { TestBed } from '@angular/core/testing';
import { Checkbox, CheckboxGroup } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Checkbox);
  fixture.componentRef.setInput('label', 'Trust this browser for 30 days');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const box = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
  return { fixture, element, box };
}

describe('Checkbox', () => {
  it.each(['compact', 'form', 'choice'] as const)(
    'is named by its wrapping label as a %s checkbox',
    (variant) => {
      const { element, box } = render({ variant });

      const label = element.querySelector('label')!;
      expect(label.contains(box)).toBe(true);
      expect(label.textContent?.trim()).toBe('Trust this browser for 30 days');
    },
  );

  it.each(['compact', 'form', 'choice'] as const)(
    'takes an id as a %s checkbox, so an error summary can move focus to it',
    (variant) => {
      expect(render({ variant, fieldId: 'f-confirmed' }).box.id).toBe('f-confirmed');
      expect(render({ variant }).box.hasAttribute('id')).toBe(false);
    },
  );

  it('takes a name of its own and a busy state while its change is saved (ADR 0106)', () => {
    const { box } = render({ variant: 'compact', ariaLabel: 'Came: Grace Thompson', busy: true });

    expect(box.getAttribute('aria-label')).toBe('Came: Grace Thompson');
    expect(box.getAttribute('aria-busy')).toBe('true');
    expect(box.disabled).toBe(false);
    const plain = render({ variant: 'compact' }).box;
    expect([plain.hasAttribute('aria-label'), plain.hasAttribute('aria-busy')]).toEqual([
      false,
      false,
    ]);
  });

  it('reports each toggle', () => {
    const { fixture, box } = render({});
    const toggles: boolean[] = [];
    fixture.componentInstance.checkedChange.subscribe((checked) => toggles.push(checked));

    box.click();
    box.click();

    expect(toggles).toEqual([true, false]);
  });

  it('reads its description with its label', () => {
    const { element } = render({
      variant: 'choice',
      description: 'A day before anything you have registered for',
    });

    expect(element.querySelector('label .choice__desc')?.textContent?.trim()).toBe(
      'A day before anything you have registered for',
    );
  });

  it.each([
    ['checked', { checked: true }, 'checked', true],
    ['disabled', { disabled: true }, 'disabled', true],
    ['indeterminate', { indeterminate: true }, 'indeterminate', true],
  ] as const)('can be %s', (_state, inputs, property, expected) => {
    const { box } = render(inputs);

    expect(box[property]).toBe(expected);
  });

  it.each([
    [true, 'true'],
    [false, null],
  ])('is marked invalid when invalid is %s', (invalid, expected) => {
    const { box } = render({ variant: 'choice', invalid });

    expect(box.getAttribute('aria-invalid')).toBe(expected);
  });
});

describe('CheckboxGroup', () => {
  it('is a fieldset named by its legend and described by its error', () => {
    const fixture = TestBed.createComponent(CheckboxGroup);
    fixture.componentRef.setInput('fieldId', 'f-email-me');
    fixture.componentRef.setInput('legend', 'Email me about');
    fixture.componentRef.setInput('error', 'Choose at least one');
    fixture.detectChanges();

    const fieldset = (fixture.nativeElement as HTMLElement).querySelector('fieldset')!;
    expect(fieldset.querySelector('legend')?.textContent?.trim()).toBe('Email me about');
    expect(fieldset.getAttribute('aria-describedby')).toBe('f-email-me-error');
  });
});
