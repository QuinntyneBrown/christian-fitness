import { TestBed } from '@angular/core/testing';
import { BrandLockup, Seal, type SealSize } from '../public-api';

function renderSeal(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Seal);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('svg')!;
}

describe('BrandLockup', () => {
  it('is a home link named by its wordmark, with the seal decorative', () => {
    const fixture = TestBed.createComponent(BrandLockup);
    fixture.componentRef.setInput('href', '/home');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a.lockup')!;
    expect(link.getAttribute('href')).toBe('/home');
    expect(link.textContent?.trim()).toBe('Christian Fitness');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Seal', () => {
  it('stands alone as an image named "Christian Fitness"', () => {
    const svg = renderSeal({ size: 'signin' });

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Christian Fitness');
  });

  it('is hidden from assistive technology when decorative', () => {
    const svg = renderSeal({ size: 'lockup', decorative: true });

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.hasAttribute('role')).toBe(false);
  });

  it.each([
    ['lockup', false],
    ['signin', false],
    ['verse', true],
    ['hero', true],
  ] as [SealSize, boolean][])('carries the ring lettering at the %s size: %s', (size, lettered) => {
    expect(renderSeal({ size }).querySelector('textPath') !== null).toBe(lettered);
  });

  it('gives each lettered seal its own path, so two on a page never share one', () => {
    const first = renderSeal({ size: 'hero' });
    const second = renderSeal({ size: 'hero' });

    const ids = [first, second].map((svg) => svg.querySelector('path')!.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(first.querySelector('textPath')?.getAttribute('href')).toBe(`#${ids[0]}`);
  });
});
