import { DOCUMENT } from '@angular/common';
import { type AfterViewInit, Component, ElementRef, inject, input } from '@angular/core';

/** One line of an error summary: what to fix, and the id of the field it moves focus to. */
export interface FormAlertItem {
  text: string;
  target: string;
}

/**
 * The design system's form alert (docs/design-system/assets/components.css, "form-alert"): a
 * message above a form, with `role="alert"`, a title and either a sentence (`text`) or, as an
 * error summary, one link per field to fix (`items`). It takes focus when it appears, so it is
 * read at once; a link moves focus to its field without leaving the page. Text is rendered as
 * text.
 */
@Component({
  selector: 'cf-form-alert',
  templateUrl: './form-alert.html',
  styleUrl: './form-alert.scss',
})
export class FormAlert implements AfterViewInit {
  readonly heading = input.required<string>();
  readonly text = input<string>();
  readonly items = input<readonly FormAlertItem[]>([]);

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly document = inject(DOCUMENT);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('.form-alert')?.focus();
  }

  /** Moves focus to the field; the page's `<base href>` would turn `#id` into another page. */
  protected focusField(event: Event, target: string): void {
    event.preventDefault();
    const field = this.document.getElementById(target);
    field?.focus();
    field?.scrollIntoView({ block: 'center' });
  }
}
