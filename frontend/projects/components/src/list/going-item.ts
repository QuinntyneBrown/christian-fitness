import { Component, input } from '@angular/core';

/**
 * The design system's going item (docs/design-system/components/list.html, "Going items and
 * static lists"): one event a member is going to, as a whole-row card link with its 16:9 picture
 * (decorative), its day and its title, inside a `cf-list` of variant `going`. An event without a
 * picture shows its day and title alone. The title is rendered as text; the link loads `href`.
 */
@Component({
  selector: 'cf-going-item',
  templateUrl: './going-item.html',
  styleUrl: './going-item.scss',
})
export class GoingItem {
  readonly href = input.required<string>();
  /** The day as the member reads it, such as "Sat, Apr 18". */
  readonly date = input.required<string>();
  readonly title = input.required<string>();
  readonly imageUrl = input<string | null>(null);
}
