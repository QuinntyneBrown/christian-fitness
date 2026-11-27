import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input } from '@angular/core';

/**
 * The design system's preference row (docs/design-system/components/preference-row.html, block
 * `pref`, element `pref__row`): one setting of a section, ruled off from the row before it. What
 * it holds (a switch, a radio group, an action) is projected. `action` is the quieter row of a
 * section's own action, such as "Turn off all email". `split` is a title (`legend`) and its
 * description on the left with the projected action on the right, such as "Request download";
 * once `done` is given, its words stand in place of the action, announced (`role="status"`).
 * `note` is the closing line of a section, such as the link to the Privacy Policy. Every word is
 * rendered as text.
 */
@Component({
  selector: 'cf-preference-row',
  imports: [NgTemplateOutlet],
  templateUrl: './preference-row.html',
  styleUrl: './preference-row.scss',
})
export class PreferenceRow {
  readonly action = input(false, { transform: booleanAttribute });
  readonly split = input(false, { transform: booleanAttribute });
  readonly note = input(false, { transform: booleanAttribute });
  /** The split row's title: "Download your data". */
  readonly legend = input('');
  /** The split row's line under its title. */
  readonly description = input<string>();
  /** What the split row says in place of its action once it is done. */
  readonly done = input<string | null>();
}
