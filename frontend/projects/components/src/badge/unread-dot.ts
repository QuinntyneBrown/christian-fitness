import { Component, input } from '@angular/core';

/**
 * The design system's unread dot (docs/design-system/components/badge.html): a labelled dot when
 * the exact number does not matter, read through `role="img"` and its `label` ("3 unread").
 */
@Component({
  selector: 'cf-unread-dot',
  templateUrl: './unread-dot.html',
  styleUrl: './unread-dot.scss',
})
export class UnreadDot {
  readonly label = input.required<string>();
}
