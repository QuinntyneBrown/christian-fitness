import { Component, input, output } from '@angular/core';

/** The design system's toast tones (docs/design-system/components/toast.html, "Variants"). */
export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * One toast of the design system (docs/design-system/components/toast.html): the result of an
 * action the person just took, on the dark notice surface. A title that stands alone, optional
 * detail, one optional action (a link with `actionHref`, otherwise a button that emits `action`)
 * and "Dismiss", which emits `dismissed`, as Escape does while focus is inside it. It never takes
 * focus on its own. It lives in a `cf-toast-region`, which owns the live regions. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  host: { '(keydown.escape)': 'dismissed.emit()' },
})
export class Toast {
  readonly tone = input<ToastTone>('info');
  readonly heading = input.required<string>();
  readonly text = input<string>();
  readonly actionLabel = input<string>();
  readonly actionHref = input<string>();

  readonly action = output<void>();
  readonly dismissed = output<void>();
}
