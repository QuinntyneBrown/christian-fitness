import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's preference row (docs/design-system/components/preference-row.html, block
 * `pref`, element `pref__row`): one setting of a section, ruled off from the row before it. What
 * it holds (a switch, a radio group, an action) is projected. `action` is the quieter row of a
 * section's own action, such as "Turn off all email".
 */
@Component({
  selector: 'cf-preference-row',
  templateUrl: './preference-row.html',
  styleUrl: './preference-row.scss',
})
export class PreferenceRow {
  readonly action = input(false, { transform: booleanAttribute });
}
