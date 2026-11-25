import { booleanAttribute, Component, input, output } from '@angular/core';
import type { RadioOption } from '../radio-group/radio-group';

/**
 * The design system's choice chips (docs/design-system/components/choice-card.html, "Chip"): one
 * answer from a longer list of short words, each a `chip chip--choice` wrapping a visually hidden
 * native radio, in a `fieldset.form-section` named by its legend. The chosen chip fills near-black
 * (the checked radio is announced, so the state is never carried by colour alone), the focused
 * one shows the focus ring, and arrow keys move the choice natively. 36 px tall, growing to a
 * 44 × 44 px target on coarse pointers. `disabled` holds every chip still. Every text is rendered
 * as text.
 */
@Component({
  selector: 'cf-choice-chip-group',
  templateUrl: './choice-chip-group.html',
  styleUrl: './choice-chip-group.scss',
})
export class ChoiceChipGroup {
  readonly legend = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly RadioOption[]>();
  readonly value = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
