import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's inline message for a section (docs/design-system/components/
 * inline-message.html), block `inline-error`: one part of a page failed while the rest worked. It
 * is announced once (`role="alert"`), names what did not load, says what still works and offers
 * "Try again", which emits `retry`; while the section reloads (`busy`) the button reads
 * "Loading…", is `aria-busy` and ignores presses. The field hint and field error on the same page
 * belong to the form field. Words are rendered as text.
 */
@Component({
  selector: 'cf-inline-message',
  templateUrl: './inline-message.html',
  styleUrl: './inline-message.scss',
})
export class InlineMessage {
  /** What didn't load, such as "Messages didn't load." */
  readonly heading = input.required<string>();
  /** What still works, such as "Your events are up to date." */
  readonly text = input<string>();
  readonly retryLabel = input('Try again');
  readonly busy = input(false, { transform: booleanAttribute });

  readonly retry = output<void>();

  protected press(): void {
    if (!this.busy()) {
      this.retry.emit();
    }
  }
}
