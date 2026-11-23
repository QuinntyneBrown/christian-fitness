import { Component, input } from '@angular/core';

/**
 * How a form lays out its fields: one calm column (`stack`, auth screens), or pairs of short
 * related fields side by side from 640 px (`grid`, the design system's `field-grid`, editor
 * dialogs).
 */
export type FormLayoutKind = 'stack' | 'grid';

/**
 * The design system's form layout (docs/design-system/components/form-layout.html): the error
 * summary or form alert projected with `slot="alert"` at the top, the fields (the default slot) in
 * one column or a `field-grid`, then the actions projected with `slot="actions"`, primary last. A
 * slot left empty takes no space. The summary itself is the alert component's; the submitting
 * state (fields read-only, primary busy) belongs to the controls inside.
 */
@Component({
  selector: 'cf-form-layout',
  templateUrl: './form-layout.html',
  styleUrl: './form-layout.scss',
})
export class FormLayout {
  readonly layout = input<FormLayoutKind>('stack');
}
