import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';
import { SkeletonRegion } from './skeleton-region';

@Component({
  imports: [Skeleton, SkeletonRegion],
  template: `
    <cf-skeleton-region label="Loading events" [busy]="busy()">
      <cf-skeleton shape="date" />
      <cf-skeleton shape="text" width="55" />
    </cf-skeleton-region>
  `,
})
class Host {
  readonly busy = signal(true);
}

@Component({
  imports: [Skeleton, SkeletonRegion],
  template: `
    <cf-skeleton-region label="Loading profile" heading>
      <cf-skeleton shape="avatar-2xl" />
    </cf-skeleton-region>
  `,
})
class PageHost {}

describe('SkeletonRegion', () => {
  it('marks the region busy, polite, and names what is loading in hidden text', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const region = fixture.nativeElement.querySelector('.skeleton-region') as HTMLElement;

    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.querySelector('.visually-hidden')?.textContent).toBe('Loading events');
  });

  it('keeps every shape out of the accessibility tree and the tab order', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const shapes = Array.from(fixture.nativeElement.querySelectorAll('.skeleton')) as HTMLElement[];

    expect(shapes).toHaveLength(2);
    for (const shape of shapes) {
      expect(shape.textContent).toBe('');
      expect(shape.getAttribute('aria-hidden')).toBe('true');
      expect(shape.tabIndex).toBe(-1);
    }
  });

  it('is no longer busy when the content has arrived', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.busy.set(false);
    await fixture.whenStable();

    const region = fixture.nativeElement.querySelector('.skeleton-region') as HTMLElement;
    expect(region.getAttribute('aria-busy')).toBe('false');
  });

  // A screen that is all skeletons still has its one heading (the profile mock's loading state).
  it('with heading, names what is loading in a hidden page heading', async () => {
    const fixture = TestBed.createComponent(PageHost);
    await fixture.whenStable();
    const region = fixture.nativeElement.querySelector('.skeleton-region') as HTMLElement;

    const heading = region.querySelector('h1');
    expect(heading?.textContent).toBe('Loading profile');
    expect(heading?.classList.contains('visually-hidden')).toBe(true);
    expect(region.querySelectorAll('.visually-hidden')).toHaveLength(1);
  });
});
