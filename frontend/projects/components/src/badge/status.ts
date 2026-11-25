import { Component, input } from '@angular/core';

/**
 * The statuses the design system names: the product's event, story and member statuses, then
 * the generic tones.
 */
export type StatusVariant =
  | 'published'
  | 'draft'
  | 'review'
  | 'scheduled'
  | 'cancelled'
  | 'active'
  | 'flagged'
  | 'suspended'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger';

/**
 * The design system's status badge (docs/design-system/components/badge.html, "Status"): one word
 * in sentence case ("Published", "Flagged") read in place. The word carries the meaning and the
 * fill only reinforces it; flagged is the loudest because it needs a decision. Static and never
 * focusable; it never wraps. The word, and an optional leading icon, are projected.
 */
@Component({
  selector: 'cf-status',
  templateUrl: './status.html',
  styleUrl: './status.scss',
})
export class Status {
  readonly variant = input.required<StatusVariant>();
}
