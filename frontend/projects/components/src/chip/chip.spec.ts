import { TestBed } from '@angular/core/testing';
import { Chip, ChipBar, Interest, InterestList, Tag } from '../public-api';

describe('Chip', () => {
  it.each([
    [true, 'page'],
    [false, null],
  ])('is a filter link, marked current when current is %s', (current, expected) => {
    const fixture = TestBed.createComponent(Chip);
    fixture.componentRef.setInput('href', '/events?type=run');
    fixture.componentRef.setInput('current', current);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/events?type=run');
    expect(link.getAttribute('aria-current')).toBe(expected);
  });
});

describe('ChipBar', () => {
  function render(divided: boolean) {
    const fixture = TestBed.createComponent(ChipBar);
    fixture.componentRef.setInput('label', 'Filter events');
    fixture.componentRef.setInput('divided', divided);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('is a group named by its label', () => {
    const bar = render(false).querySelector('.chip-bar')!;

    expect(bar.getAttribute('role')).toBe('group');
    expect(bar.getAttribute('aria-label')).toBe('Filter events');
  });

  it.each([
    [true, 1],
    [false, 0],
  ])('draws a decorative divider when divided is %s', (divided, count) => {
    const dividers = render(divided).querySelectorAll('.chip-bar__divider[aria-hidden="true"]');

    expect(dividers.length).toBe(count);
  });
});

describe('Interest', () => {
  function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(Interest);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    const changes: boolean[] = [];
    fixture.componentInstance.pressedChange.subscribe((pressed) => changes.push(pressed));
    return { fixture, button, changes };
  }

  it.each([
    [false, 'false', [true]],
    [true, 'true', [false]],
  ])('is a toggle that, pressed %s, asks to be the other way', (pressed, attribute, asked) => {
    const { button, changes } = render({ pressed });

    expect(button.getAttribute('aria-pressed')).toBe(attribute);
    button.click();

    expect(changes).toEqual(asked);
  });

  it('is a button that does not submit a form', () => {
    expect(render({}).button.type).toBe('button');
  });

  it('cannot be toggled while disabled', () => {
    expect(render({ disabled: true }).button.disabled).toBe(true);
  });
});

describe('InterestList', () => {
  it('is a fieldset named by its legend', () => {
    const fixture = TestBed.createComponent(InterestList);
    fixture.componentRef.setInput('fieldId', 'f-into');
    fixture.componentRef.setInput('legend', 'Into');
    fixture.detectChanges();

    const fieldset = (fixture.nativeElement as HTMLElement).querySelector('fieldset')!;
    expect(fieldset.querySelector('legend')?.textContent?.trim()).toBe('Into');
  });
});

describe('Tag', () => {
  it('is read-only text', () => {
    const fixture = TestBed.createComponent(Tag);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.tag')?.tagName).toBe('SPAN');
    expect(element.querySelector('a, button')).toBeNull();
  });
});
