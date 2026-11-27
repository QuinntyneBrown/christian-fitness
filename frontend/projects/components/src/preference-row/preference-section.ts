import { Component, input } from '@angular/core';

/**
 * The design system's preference section (docs/design-system/components/preference-row.html,
 * block `pref`): one section of Preferences with its heading, a line under it and its rows. The
 * section is named by its heading and reached by its `sectionId` from the section list. Rows are
 * projected `cf-preference-row`s; the words are rendered as text.
 */
@Component({
  selector: 'cf-preference-section',
  templateUrl: './preference-section.html',
  styleUrl: './preference-section.scss',
})
export class PreferenceSection {
  /** The section's id: the fragment its link in the section list leads to. */
  readonly sectionId = input.required<string>();
  readonly heading = input.required<string>();
  /** "3 of 4 emails on." */
  readonly sub = input<string>();
}
