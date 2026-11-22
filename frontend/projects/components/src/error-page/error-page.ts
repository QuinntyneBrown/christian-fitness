import { type AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';

/**
 * The design system's error page (docs/design-system/components/error-page.html): a decorative
 * code hidden from assistive technology, the page's heading, what happened and the ways back,
 * projected through `[slot=actions]`. When it opens, focus moves to the heading (L2-043 AC7).
 */
@Component({
  selector: 'cf-error-page',
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage implements AfterViewInit {
  /** The decorative code, such as "404". */
  readonly code = input.required<string>();
  /** The page's heading in plain words, such as "Page not found". */
  readonly heading = input.required<string>();
  /** What happened and what still works; rendered as text. */
  readonly text = input.required<string>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('.system__title')?.focus();
  }
}
