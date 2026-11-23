import { TestBed } from '@angular/core/testing';
import { ProgressBar, clampPercent } from '../public-api';

describe('clampPercent', () => {
  it.each([
    [64, 64],
    [0, 0],
    [100, 100],
    [-5, 0],
    [140, 100],
    [63.6, 64],
  ])('shows %d as %d', (value, percent) => {
    expect(clampPercent(value)).toBe(percent);
  });
});

describe('ProgressBar', () => {
  function render(value: number | null) {
    const fixture = TestBed.createComponent(ProgressBar);
    fixture.componentRef.setInput('label', 'Uploading cover photo');
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    return { element, track: element.querySelector('.progress__track')! };
  }

  it('is a progress bar named by its label', () => {
    const { track } = render(64);

    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-label')).toBe('Uploading cover photo');
  });

  it.each([
    [64, '64', '64%'],
    [140, '100', '100%'],
    [null, null, null],
  ])('given %s, reports %s and shows "%s"', (value, now, shown) => {
    const { element, track } = render(value);

    expect(track.getAttribute('aria-valuenow')).toBe(now);
    expect(track.getAttribute('aria-valuemin')).toBe(now === null ? null : '0');
    expect(track.getAttribute('aria-valuemax')).toBe(now === null ? null : '100');
    expect(element.querySelector('.progress__value')?.textContent?.trim() ?? null).toBe(shown);
  });

  it('slides without a value while the length is not known', () => {
    const { element } = render(null);

    expect(element.querySelector('.progress')?.classList.contains('progress--indeterminate')).toBe(
      true,
    );
  });
});
