import { afterNextRender, Component, ElementRef, inject, input } from '@angular/core';

/**
 * The design system's done block (docs/design-system/components/steps.html, "Done"): the success
 * state that replaces a sent form. A check, the thanks as the page's heading, a sentence of what
 * happens now (projected; a `<strong>` in it names what was sent) and two ways on (projected with
 * `slot="actions"`). It is announced (`role="status"`) and takes focus once it is on the page
 * (`tabindex="-1"`), so keyboard and screen-reader users start at the thanks. Every text is
 * rendered as text.
 */
@Component({
  selector: 'cf-done',
  templateUrl: './done.html',
  styleUrl: './done.scss',
})
export class Done {
  readonly heading = input.required<string>();

  constructor() {
    const host: ElementRef<HTMLElement> = inject(ElementRef);
    // After the render, not after the view: a consumer may project it into a branch that is
    // attached later in the same pass. A DOM lookup, not a view query (slice 30.1).
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('.done')?.focus());
  }
}
