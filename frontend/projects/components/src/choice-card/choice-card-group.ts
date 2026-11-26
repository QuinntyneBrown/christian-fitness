import { booleanAttribute, Component, input, output } from '@angular/core';
import type { RadioOption } from '../radio-group/radio-group';

/** The icons a card can show before its label (the design system's `choice-card__icon`). */
export type ChoiceCardIcon = 'lightbulb' | 'bug' | 'pen' | 'heart';

/** One card: a radio option with an optional icon. */
export interface ChoiceCardOption extends RadioOption {
  readonly icon?: ChoiceCardIcon;
}

/** How many cards sit side by side from 640 px: three, or four (two on phones). */
export type ChoiceCardColumns = 3 | 4;

/**
 * The design system's choice cards (docs/design-system/components/choice-card.html, "Card" and
 * "Grid"): one answer from two to four, each a native radio drawn as a bordered card with its
 * label (after an optional decorative icon) and an optional line, in a `fieldset.form-section` named by its legend. The option whose
 * value is `value` is checked and `valueChange` reports the option chosen; arrow keys move the
 * choice natively. The chosen card fills with the accent tint and a 2 px accent ring, and its
 * radio stays visible, so the state is never carried by colour alone. `disabled` holds every
 * radio still, as while a form is sending. Every text is rendered as text.
 */
@Component({
  selector: 'cf-choice-card-group',
  templateUrl: './choice-card-group.html',
  styleUrl: './choice-card-group.scss',
})
export class ChoiceCardGroup {
  readonly legend = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly ChoiceCardOption[]>();
  readonly value = input<string | null>(null);
  readonly columns = input<ChoiceCardColumns>(3);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
