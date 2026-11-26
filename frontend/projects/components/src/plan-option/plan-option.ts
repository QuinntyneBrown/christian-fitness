import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's plan option (docs/design-system/components/plan-option.html, block
 * `plan-option`): one way to take part in a series as a native radio drawn as a full-width row,
 * with its title, a note that says what the choice means now and its price. The whole row is the
 * radio's label, so the three read as its name. Checked and disabled are the radio's own
 * attributes, and the row styles itself from them. Choosing it emits its `value`. Words are text.
 */
@Component({
  selector: 'cf-plan-option',
  templateUrl: './plan-option.html',
  styleUrl: './plan-option.scss',
})
export class PlanOption {
  /** The radio group's name, shared by every option of one list. */
  readonly name = input.required<string>();
  readonly value = input.required<string>();
  /** "Every session (5 left)". */
  readonly label = input('');
  /** "Your spot is held each week", "Every place in the series is taken". */
  readonly note = input('');
  /** "$64 for all 8", "$10 each", "Free". */
  readonly price = input('');
  readonly checked = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The member chose this option. */
  readonly choose = output<string>();
}
