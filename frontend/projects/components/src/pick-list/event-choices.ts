import { booleanAttribute, Component, input, output } from '@angular/core';

/** One event to choose: its photo, date ("Sat Apr 18"), title and area line. */
export interface EventChoiceItem {
  id: string;
  imageSrc: string;
  when: string;
  title: string;
  area: string;
}

/**
 * The design system's event choices (docs/design-system/components/pick-list.html, blocks
 * `event-choices` and `event-choice`): one of a few events chosen with native radio buttons in a
 * `fieldset` named by its legend ("Event"), each label holding a decorative photo, the date, the
 * title and the area, so the whole card is the target and is read with the radio. The one whose
 * id is `value` is checked; choosing another emits `chosen`, and changing a radio never
 * navigates. `disabled` disables every radio (while assets are made). Every text is text.
 */
@Component({
  selector: 'cf-event-choices',
  templateUrl: './event-choices.html',
  styleUrl: './event-choices.scss',
})
export class EventChoices {
  readonly legend = input.required<string>();
  /** The radios' shared name. */
  readonly name = input.required<string>();
  readonly items = input.required<readonly EventChoiceItem[]>();
  /** The id of the checked event. */
  readonly value = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly chosen = output<string>();
}
