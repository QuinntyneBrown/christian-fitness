import { TestBed } from '@angular/core/testing';
import { RadioGroup, type RadioOption } from '../public-api';

const places: readonly RadioOption[] = [
  { value: 'in-person', label: 'In person', description: 'Meet at a studio or park in the GTA' },
  { value: 'virtual', label: 'Virtual', description: 'A video call from wherever you are' },
  { value: 'either', label: 'Either', disabled: true },
];

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(RadioGroup);
  fixture.componentRef.setInput('fieldId', 'f-where');
  fixture.componentRef.setInput('legend', 'Where would you like to meet?');
  fixture.componentRef.setInput('name', 'where');
  fixture.componentRef.setInput('options', places);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const radios = [...element.querySelectorAll('input[type="radio"]')] as HTMLInputElement[];
  return { fixture, element, radios };
}

describe('RadioGroup', () => {
  it('asks its question in a legend, with every answer in view and sharing one name', () => {
    const { element, radios } = render({});

    expect(element.querySelector('fieldset legend')?.textContent?.trim()).toBe(
      'Where would you like to meet?',
    );
    expect(radios.map((radio) => radio.name)).toEqual(['where', 'where', 'where']);
    expect(radios.map((radio) => radio.closest('label')?.textContent?.trim())).toEqual([
      'In person Meet at a studio or park in the GTA',
      'Virtual A video call from wherever you are',
      'Either',
    ]);
  });

  it('checks the option whose value it is given, and none without one', () => {
    expect(render({ value: 'virtual' }).radios.map((radio) => radio.checked)).toEqual([
      false,
      true,
      false,
    ]);
    expect(render({}).radios.some((radio) => radio.checked)).toBe(false);
  });

  it('reports the option chosen', () => {
    const { fixture, radios } = render({ value: 'in-person' });
    const choices: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => choices.push(value));

    radios[1].click();

    expect(choices).toEqual(['virtual']);
  });

  it('keeps an unavailable option from being chosen', () => {
    expect(render({}).radios.map((radio) => radio.disabled)).toEqual([false, false, true]);
  });

  it.each([
    ["Choose where you'd like to meet", 'true', 'f-where-error'],
    [null, null, null],
  ])(
    'marks every radio invalid and describes the group by the error "%s"',
    (error, invalid, by) => {
      const { element, radios } = render({ error });

      expect(radios.map((radio) => radio.getAttribute('aria-invalid'))).toEqual([
        invalid,
        invalid,
        invalid,
      ]);
      expect(element.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe(by);
    },
  );
});
