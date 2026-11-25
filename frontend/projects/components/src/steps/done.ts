import { type AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';

/**
 * The design system's done block (docs/design-system/components/steps.html, "Done"): the success
 * state that replaces a sent form. A check, the thanks as the page's heading, a sentence of what
 * happens now (projected; a `<strong>` in it names what was sent) and two ways on (projected with
 * `slot="actions"`). It is announced (`role="status"`) and takes focus when it appears
 * (`tabindex="-1"`), so keyboard and screen-reader users start at the thanks. Every text is
 * rendered as text.
 */
@Component({
  selector: 'cf-done',
  templateUrl: './done.html',
  styleUrl: './done.scss',
})
export class Done implements AfterViewInit {
  readonly heading = input.required<string>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add to the initial bundle (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('.done')?.focus();
  }
}
