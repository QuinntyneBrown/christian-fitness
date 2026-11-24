import {
  Directive,
  DestroyRef,
  ElementRef,
  inject,
  type OnInit,
  ViewContainerRef,
} from '@angular/core';

/**
 * Below the fold: shows `cf-landing-professionals` after this placeholder only when it nears the
 * viewport, loading that component's code then (ADR 0000). An `IntersectionObserver` is used
 * rather than `@defer`, whose runtime would grow the initial bundle past its budget. The observer
 * is released when the page goes, and a component made here is destroyed with it.
 */
@Directive({ selector: '[cfLandingProfessionalsOnView]' })
export class LandingProfessionalsOnView implements OnInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly container = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    if (typeof IntersectionObserver === 'undefined') {
      void this.show();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void this.show();
      },
      { rootMargin: '200px' },
    );
    observer.observe(this.element);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  private async show(): Promise<void> {
    const { LandingProfessionals } = await import('./landing-professionals');
    if (this.destroyed) return;
    this.element.remove();
    this.container.createComponent(LandingProfessionals);
  }
}
