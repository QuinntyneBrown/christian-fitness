import { DOCUMENT } from '@angular/common';
import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/** The design system's alert tones (docs/design-system/components/alert.html, "Variants"). */
export type AlertTone = 'danger' | 'info' | 'success';

/** One line of an error summary: what to fix, and the id of the field it moves focus to. */
export interface AlertItem {
  text: string;
  target: string;
}

let nextId = 0;

/**
 * The design system's alert (docs/design-system/components/alert.html), block `form-alert`: the
 * outcome of a whole submit above a form, dialog or drawer. A danger alert is announced at once
 * (`role="alert"`), info and success politely (`role="status"`). It takes focus when it appears
 * (`tabindex="-1"`), so keyboard and screen-reader users start at the explanation, unless
 * `focusOnShow` is false. As an error summary (`items`) it is labelled by its title and lists one
 * link per field; a link moves focus to its field without leaving the page. A sentence of next
 * steps is projected after the title. Words are rendered as text.
 */
@Component({
  selector: 'cf-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
})
export class Alert implements AfterViewInit {
  readonly tone = input<AlertTone>('danger');
  /** What went wrong, in a sentence: the alert's name. */
  readonly heading = input.required<string>();
  /** The error summary's lines, one per field to fix. */
  readonly items = input<readonly AlertItem[]>([]);
  /** Moves focus to the alert when it appears (after a submit). */
  readonly focusOnShow = input(true, { transform: booleanAttribute });

  protected readonly titleId = `cf-alert-title-${nextId++}`;

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly document = inject(DOCUMENT);

  protected classes(): string {
    const tone = this.tone();
    return tone === 'danger' ? 'form-alert' : `form-alert form-alert--${tone}`;
  }

  ngAfterViewInit(): void {
    if (this.focusOnShow()) {
      // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
      this.host.nativeElement.querySelector<HTMLElement>('.form-alert')?.focus();
    }
  }

  /** Moves focus to the field; the page's `<base href>` would turn `#id` into another page. */
  protected focusField(event: Event, target: string): void {
    event.preventDefault();
    const field = this.document.getElementById(target);
    field?.focus();
    field?.scrollIntoView?.({ block: 'center' });
  }
}
