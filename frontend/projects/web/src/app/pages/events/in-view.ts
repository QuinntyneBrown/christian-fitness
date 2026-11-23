import { Directive, DestroyRef, ElementRef, inject, output } from '@angular/core';

/** How far below the screen the next page is asked for, so it is ready before the end shows. */
const LOOK_AHEAD = '400px';

/**
 * Says `inView` once its element is on screen or near it (L2-009 AC5): the end of a paged list.
 * One `IntersectionObserver` watches the element and is disconnected when it is destroyed, which
 * is also when the list has no more to ask for.
 */
@Directive({ selector: '[cfInView]' })
export class InView {
  readonly inView = output<void>();

  constructor() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.inView.emit();
      },
      { rootMargin: `0px 0px ${LOOK_AHEAD} 0px` },
    );
    observer.observe(inject<ElementRef<Element>>(ElementRef).nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
