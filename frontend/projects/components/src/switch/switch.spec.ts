import { TestBed } from '@angular/core/testing';
import { Switch } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Switch);
  fixture.componentRef.setInput('label', 'Message notifications');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  const element = fixture.nativeElement as HTMLElement;
  const toggle = element.querySelector('input')!;
  return { fixture, element, toggle };
}

describe('Switch', () => {
  it('is a switch named by the setting, with what on means read with it', () => {
    const { element, toggle } = render({
      description: 'A push notification for each new message',
    });

    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.type).toBe('checkbox');
    expect(element.querySelector('label')?.contains(toggle)).toBe(true);
    expect(element.querySelector('label')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Message notifications A push notification for each new message',
    );
  });

  it('reports each flip at once', () => {
    const { fixture, toggle } = render({ checked: false });
    const flips: boolean[] = [];
    fixture.componentInstance.checkedChange.subscribe((checked) => flips.push(checked));

    toggle.click();
    toggle.click();

    expect(flips).toEqual([true, false]);
  });

  it.each([
    [true, true],
    [false, false],
  ])('shows on when checked is %s', (checked, expected) => {
    expect(render({ checked }).toggle.checked).toBe(expected);
  });

  it('marks its row busy while the setting saves', () => {
    const { element } = render({ busy: true });

    expect(element.querySelector('label')?.getAttribute('aria-busy')).toBe('true');
  });

  it('cannot be flipped while disabled', () => {
    expect(render({ disabled: true }).toggle.disabled).toBe(true);
  });
});
