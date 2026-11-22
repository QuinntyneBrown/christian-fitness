import { booleanAttribute, Component, input, output } from '@angular/core';
import type { InterestKey, InterestOption } from '@cf/api';

/**
 * The design system's interest toggles (docs/design-system/components/chip.html, "Interest
 * toggles"): a fieldset with its legend and one `interest` button per option, pressed
 * (`aria-pressed="true"`) when its key is selected. Pressing one emits `toggled` with its key;
 * the consumer decides the new selection. `disabled` holds them while a form is submitting.
 */
@Component({
  selector: 'cf-interest-picker',
  templateUrl: './interest-picker.html',
  styleUrl: './interest-picker.scss',
})
export class InterestPicker {
  readonly legend = input.required<string>();
  readonly options = input.required<readonly InterestOption[]>();
  readonly selected = input<readonly InterestKey[]>([]);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly toggled = output<InterestKey>();
}
