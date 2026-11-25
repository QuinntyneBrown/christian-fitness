import { Component, input } from '@angular/core';

/** One step of what happens next: a short title and its line. */
export interface StepItem {
  readonly title: string;
  readonly text: string;
}

/**
 * The design system's steps (docs/design-system/components/steps.html): "What happens next" as an
 * ordered list, each step numbered in a ringed circle and joined to the next by a hairline. It is
 * information, not a progress tracker: no step is current or done. The numbers are `aria-hidden`
 * because the list is ordered. Every text is rendered as text.
 */
@Component({
  selector: 'cf-steps',
  templateUrl: './steps.html',
  styleUrl: './steps.scss',
})
export class Steps {
  readonly items = input.required<readonly StepItem[]>();
}
