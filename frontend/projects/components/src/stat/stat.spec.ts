import { TestBed } from '@angular/core/testing';
import { Fill, fillOf } from './fill';
import { StatGrid } from './stat-grid';

describe('fillOf', () => {
  // Nearly full is 90% and over (stat.html, "States"), one row per case.
  it.each<[number, number, number, boolean]>([
    [142, 200, 71, false],
    [22, 24, 92, true],
    [9, 10, 90, true],
    [89, 100, 89, false],
    [0, 60, 0, false],
    [60, 60, 100, true],
    [0, 0, 0, false],
  ])('%i of %i is %i percent (nearly full: %s)', (count, capacity, percent, high) => {
    expect(fillOf(count, capacity)).toEqual({ percent, high });
  });
});

describe('Fill', () => {
  it('shows both numbers first and repeats them in words on a native meter', async () => {
    const fixture = TestBed.createComponent(Fill);
    fixture.componentRef.setInput('label', 'Easter Sunrise 5K');
    fixture.componentRef.setInput('count', 142);
    fixture.componentRef.setInput('capacity', 200);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.fill__count')?.textContent).toBe('142 / 200');
    expect(el.querySelector('.fill__pct')?.textContent).toBe('71%');
    const meter = el.querySelector('meter') as HTMLMeterElement;
    expect([
      meter.getAttribute('min'),
      meter.getAttribute('max'),
      meter.getAttribute('value'),
    ]).toEqual(['0', '200', '142']);
    expect(meter.getAttribute('aria-label')).toBe('Easter Sunrise 5K: 142 of 200 registered');
  });
});

describe('StatGrid', () => {
  it('lists each figure as a term and its value', async () => {
    const fixture = TestBed.createComponent(StatGrid);
    fixture.componentRef.setInput('items', [
      { label: 'Registrations, April', value: '221' },
      { label: 'Live listings', value: '5' },
    ]);
    await fixture.whenStable();

    const pairs = Array.from(fixture.nativeElement.querySelectorAll('dl > div')).map((pair) => [
      (pair as HTMLElement).querySelector('dt')?.textContent,
      (pair as HTMLElement).querySelector('dd')?.textContent,
    ]);
    expect(pairs).toEqual([
      ['Registrations, April', '221'],
      ['Live listings', '5'],
    ]);
  });
});
