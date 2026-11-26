import { Component, input } from '@angular/core';

/**
 * The design system's ruled section title (docs/design-system/components/section-heading.html,
 * block `rule-title`): a condensed italic `h2` over a heavy rule, heading a list in a rail or an
 * issue ("Upcoming events", "Most read"). `headingId` lets the section it heads name itself with
 * `aria-labelledby`. Words are rendered as text.
 */
@Component({
  selector: 'cf-rule-title',
  templateUrl: './rule-title.html',
  styleUrl: './rule-title.scss',
})
export class RuleTitle {
  readonly heading = input.required<string>();
  readonly headingId = input<string>();
}
