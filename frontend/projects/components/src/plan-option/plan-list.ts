import { Component, input } from '@angular/core';

/**
 * The design system's plan list (docs/design-system/components/plan-option.html, block
 * `plan-list`): the borderless fieldset that stacks plan options 8 px apart, with a visually
 * hidden legend naming the question, so the options are one radio group.
 */
@Component({
  selector: 'cf-plan-list',
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.scss',
})
export class PlanList {
  /** "How would you like to come?" */
  readonly legend = input.required<string>();
}
