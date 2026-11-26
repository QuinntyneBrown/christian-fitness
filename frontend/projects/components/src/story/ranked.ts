import { Component, input } from '@angular/core';

/** One story of a ranked list: its title and where it leads. */
export interface RankedItem {
  id: string;
  title: string;
  href: string;
}

/**
 * The design system's ranked list (docs/design-system/components/story.html, block `ranked`):
 * "Most read", an ordered list whose big numerals are decoration (the list itself carries the
 * order) and whose titles are the links to each story. Words are rendered as text.
 */
@Component({
  selector: 'cf-ranked',
  templateUrl: './ranked.html',
  styleUrl: './ranked.scss',
})
export class Ranked {
  readonly items = input.required<readonly RankedItem[]>();
}
