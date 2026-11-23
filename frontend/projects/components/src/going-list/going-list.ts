import { Component, input } from '@angular/core';

/** One event in "Going to": where it opens, its day, its title and its picture, if any. */
export interface GoingItem {
  href: string;
  /** The day as the member reads it, such as "Sat, Apr 18". */
  date: string;
  title: string;
  imageUrl: string | null;
}

/**
 * The design system's `going-list` (docs/design-system/components/list.html, "Going items"): one
 * card link per event, with its picture (decorative), day and title, as the profile's "Going to"
 * shows them. An event without a picture shows its day and title alone. Titles are rendered as
 * text. Each link loads its `href`.
 */
@Component({
  selector: 'cf-going-list',
  templateUrl: './going-list.html',
  styleUrl: './going-list.scss',
})
export class GoingList {
  readonly items = input.required<readonly GoingItem[]>();
}
