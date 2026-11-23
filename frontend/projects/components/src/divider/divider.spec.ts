import { TestBed } from '@angular/core/testing';
import { Divider } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Divider);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).firstElementChild!;
}

describe('Divider', () => {
  it('is a thematic break between sections', () => {
    expect(render({}).tagName).toBe('HR');
  });

  it('reads its label as a separator', () => {
    const divider = render({ variant: 'label', label: 'or' });

    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-label')).toBe('or');
    expect(divider.textContent?.trim()).toBe('or');
  });

  it('is hidden from assistive technology between groups in a row', () => {
    expect(render({ variant: 'vertical' }).getAttribute('aria-hidden')).toBe('true');
  });
});
