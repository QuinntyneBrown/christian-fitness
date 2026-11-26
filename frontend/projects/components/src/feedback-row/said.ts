import { Component, input } from '@angular/core';

/** One change that began as feedback: the member's words, what changed and the month. */
export interface SaidItem {
  readonly quote: string;
  readonly did: string;
  readonly when: string;
}

/**
 * The design system's "You said, we did" (docs/design-system/components/feedback-row.html,
 * `.said`): a lead line and a ruled list of changes that began as member feedback, each the
 * member's words in muted italic quotes, what changed in semibold and the month. The heading is
 * the form page's aside heading. Every text is rendered as text.
 */
@Component({
  selector: 'cf-said',
  templateUrl: './said.html',
  styleUrl: './said.scss',
})
export class Said {
  readonly lead = input.required<string>();
  readonly items = input.required<readonly SaidItem[]>();
}
