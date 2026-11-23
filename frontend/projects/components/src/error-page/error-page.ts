import { NgTemplateOutlet } from '@angular/common';
import { type AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';

/** A whole route that failed (`page`: 404, 500, offline) or the admin console's 403 card. */
export type ErrorPageVariant = 'page' | 'staff';

/**
 * The design system's error page (docs/design-system/components/error-page.html). As a `page`, a
 * decorative code hidden from assistive technology, the page's heading, what happened and the
 * ways back. As the admin console's `staff` card, an eyebrow naming the console, the heading, a
 * lead, the action and a note on how to get access, with no code. The actions are projected
 * through `[slot=actions]` once for both. When it opens, focus moves to the heading, the page's
 * only `h1` (L2-043 AC7). Words are rendered as text.
 */
@Component({
  selector: 'cf-error-page',
  imports: [NgTemplateOutlet],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage implements AfterViewInit {
  readonly variant = input<ErrorPageVariant>('page');
  /** The decorative code, such as "404" or "Offline". */
  readonly code = input<string>();
  /** The page's heading in plain words, such as "Page not found". */
  readonly heading = input.required<string>();
  /** What happened and what still works; rendered as text. */
  readonly text = input.required<string>();
  /** The staff card's eyebrow, such as "Admin console". */
  readonly eyebrow = input<string>();
  /** The staff card's note, such as how to get staff access. */
  readonly note = input<string>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('h1')?.focus();
  }
}
