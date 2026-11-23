import { Component, input, output } from '@angular/core';

let nextId = 0;

/**
 * The design system's dialog (docs/design-system/components/dialog.html): the presentation a CDK
 * Dialog renders, never a hand-rolled overlay. It draws the scrim and the panel (a bottom sheet
 * below 640 px, centred up to 512 px above), the title, the subtitle, "Close", a scrolling body
 * and a footer of actions projected through `[slot=foot]`. The CDK Dialog's container owns
 * `role="dialog"`, `aria-modal`, the focus trap, Escape and focus return; its opener passes this
 * dialog's `titleId` and `descriptionId` as the config's `ariaLabelledBy` and `ariaDescribedBy`
 * and opens it without a CDK backdrop, since the scrim is drawn here (ADR 0017). "Close" and the
 * scrim emit `closed`. With `successHeading` the body becomes a polite success message. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  readonly heading = input.required<string>();
  /** The context: who, what, price. */
  readonly subtitle = input<string>();
  readonly titleId = input(`cf-dialog-title-${nextId}`);
  readonly descriptionId = input(`cf-dialog-desc-${nextId++}`);
  readonly closeLabel = input('Close');
  /** Shown in place of the body once the task is done. */
  readonly successHeading = input<string>();
  readonly successText = input<string>();

  readonly closed = output<void>();
}
