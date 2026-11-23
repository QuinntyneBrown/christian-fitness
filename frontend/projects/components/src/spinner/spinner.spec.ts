import { TestBed } from '@angular/core/testing';
import { Spinner } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Spinner);
  fixture.componentRef.setInput('label', 'Refreshing…');
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('Spinner', () => {
  afterEach(() => vi.useRealTimers());

  it('always says what is loading, with the ring hidden from assistive technology', () => {
    const { element } = render({ delay: 0 });

    expect(element.querySelector('.spinner__ring')?.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector('.spinner')?.textContent?.trim()).toBe('Refreshing…');
  });

  it('keeps its label for screen readers when the context makes it obvious', () => {
    const { element } = render({ delay: 0, hideLabel: true });

    expect(element.querySelector('.spinner .visually-hidden')?.textContent).toBe('Refreshing…');
  });

  it('shows only after 300 ms by default, so fast answers do not flash', () => {
    vi.useFakeTimers();
    const { fixture, element } = render({});

    vi.advanceTimersByTime(299);
    fixture.detectChanges();
    expect(element.querySelector('.spinner')).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(element.querySelector('.spinner')).not.toBeNull();
  });

  it('drops its pending timer when destroyed', () => {
    vi.useFakeTimers();
    const { fixture } = render({});

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
